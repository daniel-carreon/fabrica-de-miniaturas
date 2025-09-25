-- 🔍 DIAGNOSTIC: Check current Supabase database state
-- Use this to verify what exists before applying fixes
-- Daniel Carreon - Flux Context Project

-- ==========================================
-- CHECK 1: VERIFY TABLES EXIST
-- ==========================================

-- Check if all required tables exist
SELECT 
  table_name,
  CASE WHEN table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('generated_images', 'combined_images', 'favorite_images')
ORDER BY table_name;

-- ==========================================
-- CHECK 2: VERIFY RLS STATUS
-- ==========================================

-- Check RLS status for all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as rls_status
FROM pg_tables 
WHERE tablename IN ('generated_images', 'combined_images', 'favorite_images')
  AND schemaname = 'public'
ORDER BY tablename;

-- ==========================================
-- CHECK 3: LIST CURRENT RLS POLICIES
-- ==========================================

-- Show all existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('generated_images', 'combined_images', 'favorite_images')
ORDER BY tablename, policyname;

-- ==========================================
-- CHECK 4: VERIFY TABLE STRUCTURES
-- ==========================================

-- Check generated_images structure
SELECT 
  'generated_images' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'generated_images' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check combined_images structure (if exists)
SELECT 
  'combined_images' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'combined_images' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check favorite_images structure (if exists)
SELECT 
  'favorite_images' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'favorite_images' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ==========================================
-- CHECK 5: VERIFY INDEXES
-- ==========================================

-- List all indexes on our tables
SELECT 
  t.relname as table_name,
  i.relname as index_name,
  ix.indisprimary as is_primary,
  ix.indisunique as is_unique
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
WHERE t.relname IN ('generated_images', 'combined_images', 'favorite_images')
ORDER BY t.relname, i.relname;

-- ==========================================
-- CHECK 6: COUNT EXISTING RECORDS
-- ==========================================

-- Count records in each table (if they exist)
DO $$
DECLARE
    table_exists boolean;
BEGIN
    -- Check generated_images
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'generated_images'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'generated_images count: %', (SELECT COUNT(*) FROM generated_images);
    ELSE
        RAISE NOTICE 'generated_images: TABLE MISSING';
    END IF;
    
    -- Check combined_images
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'combined_images'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'combined_images count: %', (SELECT COUNT(*) FROM combined_images);
    ELSE
        RAISE NOTICE 'combined_images: TABLE MISSING';
    END IF;
    
    -- Check favorite_images
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'favorite_images'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'favorite_images count: %', (SELECT COUNT(*) FROM favorite_images);
    ELSE
        RAISE NOTICE 'favorite_images: TABLE MISSING';
    END IF;
END $$;

-- ==========================================
-- CHECK 7: IDENTIFY POTENTIAL ISSUES
-- ==========================================

-- Check for common issues
SELECT 
  'DIAGNOSIS' as section,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'favorite_images') THEN
      '❌ CRITICAL: favorite_images table is missing (causing RLS errors)'
    ELSE
      '✅ favorite_images table exists'
  END as favorite_table_status;

SELECT 
  'DIAGNOSIS' as section,
  CASE 
    WHEN COUNT(*) = 0 THEN
      '❌ CRITICAL: No RLS policies found (will block anonymous access)'
    ELSE
      '✅ RLS policies exist: ' || COUNT(*)::text
  END as rls_policy_status
FROM pg_policies 
WHERE tablename IN ('generated_images', 'combined_images', 'favorite_images');

-- ==========================================
-- ✅ DIAGNOSTIC COMPLETED
-- ==========================================