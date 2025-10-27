-- Migration: Create chat_messages table
-- Date: 2025-10-27
-- Purpose: Store individual chat messages within conversations

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

  -- Message metadata
  role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Tool calling data
  tool_used VARCHAR(100),
  tool_arguments JSONB,
  tool_result JSONB,

  -- Reasoning and metadata
  reasoning_details JSONB,
  usage JSONB DEFAULT '{}'::jsonb,  -- Token usage from API
  model VARCHAR(100),
  message_index INTEGER  -- Order within conversation

);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_role ON chat_messages(role);
CREATE INDEX IF NOT EXISTS idx_chat_messages_tool_used ON chat_messages(tool_used);

-- Add table comments
COMMENT ON TABLE chat_messages IS 'Individual messages within a conversation (user queries, AI responses, tool calls)';
COMMENT ON COLUMN chat_messages.conversation_id IS 'Foreign key to conversations table';
COMMENT ON COLUMN chat_messages.role IS 'Message origin: user, assistant, or system';
COMMENT ON COLUMN chat_messages.tool_used IS 'Tool name if this message triggered a tool call (generate_avatar, combine_images, etc)';
COMMENT ON COLUMN chat_messages.tool_result IS 'Result from tool execution if applicable';
COMMENT ON COLUMN chat_messages.usage IS 'Token usage stats from OpenRouter API';

-- Enable RLS (inherit from parent conversation)
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages from own conversations" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = chat_messages.conversation_id
      AND conversations.user_id = current_user_id()
    )
  );

CREATE POLICY "Users can create messages in own conversations" ON chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = chat_messages.conversation_id
      AND conversations.user_id = current_user_id()
    )
  );

CREATE POLICY "Users can delete messages from own conversations" ON chat_messages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = chat_messages.conversation_id
      AND conversations.user_id = current_user_id()
    )
  );
