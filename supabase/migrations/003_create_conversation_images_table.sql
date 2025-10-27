-- Migration: Create conversation_images table
-- Date: 2025-10-27
-- Purpose: Link generated/combined images to conversations they were created in

CREATE TABLE IF NOT EXISTS conversation_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,

  -- Image reference (link to one of the generated_images / combined_images tables)
  image_id TEXT NOT NULL,  -- Can be image_id from any generation table
  image_source VARCHAR(50) NOT NULL CHECK (image_source IN ('generated', 'combined', 'uploaded', 'created')),

  -- Image URLs
  original_url TEXT NOT NULL,
  supabase_url TEXT,

  -- Metadata
  prompt TEXT,
  tool_used VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Search/filter support
  tags TEXT[] DEFAULT '{}'::TEXT[],
  quality_score FLOAT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conversation_images_conversation_id ON conversation_images(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_images_image_id ON conversation_images(image_id);
CREATE INDEX IF NOT EXISTS idx_conversation_images_source ON conversation_images(image_source);
CREATE INDEX IF NOT EXISTS idx_conversation_images_created_at ON conversation_images(created_at DESC);

-- Add comments
COMMENT ON TABLE conversation_images IS 'Links images to the conversations where they were generated';
COMMENT ON COLUMN conversation_images.conversation_id IS 'Foreign key to conversations (can be NULL for images created outside conversations)';
COMMENT ON COLUMN conversation_images.image_source IS 'Source of image: generated (Flux), combined (Nano Banana), uploaded (user), created (Gemini)';
COMMENT ON COLUMN conversation_images.prompt IS 'Original prompt used to generate this image';
COMMENT ON COLUMN conversation_images.tool_used IS 'Tool that created image (generate_avatar, combine_images, create_images)';

-- Enable RLS (inherit from conversation)
ALTER TABLE conversation_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view images from own conversations" ON conversation_images
  FOR SELECT USING (
    conversation_id IS NULL OR EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_images.conversation_id
      AND conversations.user_id = current_user_id()
    )
  );

CREATE POLICY "Users can create images in own conversations" ON conversation_images
  FOR INSERT WITH CHECK (
    conversation_id IS NULL OR EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_images.conversation_id
      AND conversations.user_id = current_user_id()
    )
  );

CREATE POLICY "Users can delete images from own conversations" ON conversation_images
  FOR DELETE USING (
    conversation_id IS NULL OR EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_images.conversation_id
      AND conversations.user_id = current_user_id()
    )
  );
