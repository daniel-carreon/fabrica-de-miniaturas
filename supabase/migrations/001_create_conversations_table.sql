-- Migration: Create conversations table
-- Date: 2025-10-27
-- Purpose: Store conversation sessions for minifab chat agent

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT DEFAULT 'Nueva Conversación',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_favorite BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- For future auth integration (currently single user)
  user_id TEXT DEFAULT 'daniel',

  CONSTRAINT title_not_empty CHECK (title != '')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_is_favorite ON conversations(is_favorite);

-- Add table comment for documentation
COMMENT ON TABLE conversations IS 'Stores conversation sessions for minifab chat agent';
COMMENT ON COLUMN conversations.id IS 'Unique identifier for each conversation';
COMMENT ON COLUMN conversations.title IS 'Human-readable conversation title (auto-generated from first message or user-edited)';
COMMENT ON COLUMN conversations.metadata IS 'JSONB for storing conversation context like model, parameters, theme settings';
COMMENT ON COLUMN conversations.user_id IS 'User identifier (currently hardcoded as "daniel" for single-user setup)';

-- Enable RLS (Row Level Security) for future auth
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: users can only see their own conversations
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (user_id = current_user_id());

CREATE POLICY "Users can create own conversations" ON conversations
  FOR INSERT WITH CHECK (user_id = current_user_id());

CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE USING (user_id = current_user_id());

CREATE POLICY "Users can delete own conversations" ON conversations
  FOR DELETE USING (user_id = current_user_id());

-- Helper function for current_user_id (fallback)
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS TEXT AS $$
BEGIN
  -- Returns authenticated user ID if exists, otherwise 'daniel' (development default)
  RETURN COALESCE(
    auth.uid()::TEXT,
    'daniel'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
