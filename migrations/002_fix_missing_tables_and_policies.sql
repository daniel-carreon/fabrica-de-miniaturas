-- 🔧 FIX: Missing tables and RLS policies for anonymous access
-- Migration to fix Supabase database issues
-- Daniel Carreon - Flux Context Project

-- ==========================================
-- STEP 1: CREATE MISSING FAVORITE_IMAGES TABLE
-- ==========================================

-- Create favorite_images table (referenced in favorites route but missing)
CREATE TABLE IF NOT EXISTS favorite_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_id TEXT NOT NULL,
  original_url TEXT NOT NULL,
  supabase_url TEXT,
  prompt TEXT NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  tags TEXT[] DEFAULT '{}',
  quality_score FLOAT,
  webp_optimized BOOLEAN DEFAULT false,
  storage_folder TEXT DEFAULT 'favorites/'
);

-- ==========================================
-- STEP 2: INDEXES FOR FAVORITE_IMAGES PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_favorite_images_saved_at ON favorite_images(saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorite_images_webp_optimized ON favorite_images(webp_optimized);
CREATE INDEX IF NOT EXISTS idx_favorite_images_prompt_search ON favorite_images USING gin(to_tsvector('english', prompt));

-- ==========================================
-- STEP 3: ENABLE RLS ON ALL TABLES
-- ==========================================

-- Enable RLS on favorite_images
ALTER TABLE favorite_images ENABLE ROW LEVEL SECURITY;

-- Ensure RLS is enabled on existing tables (idempotent)
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE combined_images ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- STEP 4: CREATE PERMISSIVE RLS POLICIES FOR ANONYMOUS ACCESS
-- ==========================================

-- Drop existing policies if they exist (for clean slate)
DROP POLICY IF EXISTS "Enable all operations for all users" ON generated_images;
DROP POLICY IF EXISTS "Enable all operations for all users" ON combined_images;
DROP POLICY IF EXISTS "Enable all operations for all users" ON favorite_images;

-- Create permissive policies for all operations (MVP approach for anonymous access)
CREATE POLICY "Allow all operations for anonymous users" ON generated_images
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for anonymous users" ON combined_images
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for anonymous users" ON favorite_images
  FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- STEP 5: STORAGE BUCKET POLICIES (Execute in Supabase Dashboard)
-- ==========================================

/*
IMPORTANT: These storage policies need to be created in Supabase Dashboard
because they can't be created via SQL migrations.

Go to: Storage > images bucket > Policies

Create these policies:

1. "Allow anonymous uploads to images bucket"
   - Operation: INSERT
   - Policy: (true)
   - WITH CHECK: (true)

2. "Allow anonymous reads from images bucket"
   - Operation: SELECT
   - Policy: (true)

3. "Allow anonymous updates to images bucket"
   - Operation: UPDATE
   - Policy: (true)
   - WITH CHECK: (true)

4. "Allow anonymous deletes from images bucket"
   - Operation: DELETE
   - Policy: (true)
*/

-- ==========================================
-- STEP 6: OPTIMIZE EXISTING INDEXES FOR PERFORMANCE
-- ==========================================

-- Add missing indexes that might cause timeouts
CREATE INDEX IF NOT EXISTS idx_combined_images_source_images ON combined_images USING gin(source_images);
CREATE INDEX IF NOT EXISTS idx_generated_images_image_id ON generated_images(image_id);
CREATE INDEX IF NOT EXISTS idx_combined_images_image_id ON combined_images(image_id);
CREATE INDEX IF NOT EXISTS idx_favorite_images_image_id ON favorite_images(image_id);

-- ==========================================
-- STEP 7: ANALYZE TABLES FOR QUERY PLANNER
-- ==========================================

-- Update table statistics for better query planning
ANALYZE generated_images;
ANALYZE combined_images;
ANALYZE favorite_images;

-- ==========================================
-- STEP 8: COMMENTS AND VERIFICATION
-- ==========================================

COMMENT ON TABLE favorite_images IS 'Table for storing user favorite images with WebP optimization';
COMMENT ON COLUMN favorite_images.webp_optimized IS 'Flag indicating if image has been converted to WebP and stored in Supabase';
COMMENT ON COLUMN favorite_images.storage_folder IS 'Supabase Storage folder path for organization';

-- Verify all tables exist and have RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN 'RLS Enabled'
    ELSE 'RLS Disabled'
  END as rls_status
FROM pg_tables 
WHERE tablename IN ('generated_images', 'combined_images', 'favorite_images')
  AND schemaname = 'public';

-- Count policies per table
SELECT 
  pol.schemaname,
  pol.tablename,
  COUNT(*) as policy_count
FROM pg_policies pol
WHERE pol.tablename IN ('generated_images', 'combined_images', 'favorite_images')
GROUP BY pol.schemaname, pol.tablename;

-- ==========================================
-- ✅ MIGRATION COMPLETED
-- ==========================================

-- Final verification query
SELECT
  'generated_images' as table_name,
  COUNT(*) as row_count
FROM generated_images
UNION ALL
SELECT
  'combined_images' as table_name,
  COUNT(*) as row_count
FROM combined_images
UNION ALL
SELECT
  'favorite_images' as table_name,
  COUNT(*) as row_count
FROM favorite_images;