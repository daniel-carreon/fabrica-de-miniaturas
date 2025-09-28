-- 🗄️ SUPABASE SETUP COMPLETO - YouTube Lead Magnet Ready
-- ===================================================================
-- COPY-PASTE ESTE SCRIPT COMPLETO EN SUPABASE SQL EDITOR
-- Sitio: https://supabase.com/dashboard > Tu Proyecto > SQL Editor > New Query
-- ===================================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================================================
-- 1. TABLA: generated_images (Imágenes generadas con Replicate)
-- ===================================================================

CREATE TABLE IF NOT EXISTS generated_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_id TEXT NOT NULL,
  replicate_url TEXT NOT NULL,
  supabase_url TEXT,
  prompt TEXT NOT NULL,
  model_version TEXT,
  model_parameters JSONB DEFAULT '{}',
  generation_session TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  tags TEXT[] DEFAULT '{}',
  quality_score FLOAT,
  webp_optimized BOOLEAN DEFAULT false,
  storage_folder TEXT DEFAULT 'generated/',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================================================
-- 2. TABLA: combined_images (Imágenes combinadas con Nano Banana)
-- ===================================================================

CREATE TABLE IF NOT EXISTS combined_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  supabase_url TEXT,
  combination_prompt TEXT NOT NULL,
  source_images JSONB NOT NULL DEFAULT '[]',
  model_used TEXT DEFAULT 'nano-banana',
  combination_session TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tags TEXT[] DEFAULT '{}',
  quality_score FLOAT,
  webp_optimized BOOLEAN DEFAULT false,
  storage_folder TEXT DEFAULT 'combined/'
);

-- ===================================================================
-- 3. TABLA: favorite_images (Imágenes favoritas del usuario)
-- ===================================================================

CREATE TABLE IF NOT EXISTS favorite_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_id TEXT NOT NULL,
  original_url TEXT NOT NULL,
  supabase_url TEXT,
  prompt TEXT NOT NULL,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================================================
-- 4. TABLA: user_uploads (Imágenes subidas por el usuario)
-- ===================================================================

CREATE TABLE IF NOT EXISTS user_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_size BIGINT CHECK (file_size > 0 AND file_size <= (50 * 1024 * 1024)),
  mime_type TEXT CHECK (mime_type LIKE 'image/%'),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  original_dimensions JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  description TEXT,
  user_id UUID
);

-- ===================================================================
-- 5. TABLA: saved_prompts (Prompts guardados del usuario)
-- ===================================================================

CREATE TABLE IF NOT EXISTS saved_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,
  prompt TEXT NOT NULL,
  category VARCHAR DEFAULT 'custom' CHECK (category IN ('thumbnail', 'portrait', 'background', 'custom')),
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID
);

-- ===================================================================
-- 6. INDEXES PARA PERFORMANCE ÓPTIMA
-- ===================================================================

-- Generated Images Indexes
CREATE INDEX IF NOT EXISTS idx_generated_images_session ON generated_images(generation_session);
CREATE INDEX IF NOT EXISTS idx_generated_images_generated_at ON generated_images(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_images_webp_optimized ON generated_images(webp_optimized);
CREATE INDEX IF NOT EXISTS idx_generated_images_image_id ON generated_images(image_id);

-- Combined Images Indexes
CREATE INDEX IF NOT EXISTS idx_combined_images_session ON combined_images(combination_session);
CREATE INDEX IF NOT EXISTS idx_combined_images_created_at ON combined_images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_combined_images_webp_optimized ON combined_images(webp_optimized);
CREATE INDEX IF NOT EXISTS idx_combined_images_image_id ON combined_images(image_id);
CREATE INDEX IF NOT EXISTS idx_combined_images_source_images ON combined_images USING gin(source_images);

-- Favorite Images Indexes
CREATE INDEX IF NOT EXISTS idx_favorite_images_saved_at ON favorite_images(saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorite_images_image_id ON favorite_images(image_id);

-- User Uploads Indexes
CREATE INDEX IF NOT EXISTS idx_user_uploads_uploaded_at ON user_uploads(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_uploads_user_id ON user_uploads(user_id);

-- Saved Prompts Indexes
CREATE INDEX IF NOT EXISTS idx_saved_prompts_category ON saved_prompts(category);
CREATE INDEX IF NOT EXISTS idx_saved_prompts_is_favorite ON saved_prompts(is_favorite);
CREATE INDEX IF NOT EXISTS idx_saved_prompts_user_id ON saved_prompts(user_id);

-- ===================================================================
-- 7. RLS POLICIES - ACCESO PÚBLICO PARA SIMPLICIDAD
-- ===================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE combined_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_prompts ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas (acceso total para MVP)
-- NOTA: En producción, estas deberían ser más restrictivas

-- Generated Images Policies
DROP POLICY IF EXISTS "Allow all operations for all users" ON generated_images;
CREATE POLICY "Allow all operations for all users" ON generated_images
  FOR ALL USING (true) WITH CHECK (true);

-- Combined Images Policies
DROP POLICY IF EXISTS "Allow all operations for all users" ON combined_images;
CREATE POLICY "Allow all operations for all users" ON combined_images
  FOR ALL USING (true) WITH CHECK (true);

-- Favorite Images Policies
DROP POLICY IF EXISTS "Allow all operations for all users" ON favorite_images;
CREATE POLICY "Allow all operations for all users" ON favorite_images
  FOR ALL USING (true) WITH CHECK (true);

-- User Uploads Policies
DROP POLICY IF EXISTS "Allow all operations for all users" ON user_uploads;
CREATE POLICY "Allow all operations for all users" ON user_uploads
  FOR ALL USING (true) WITH CHECK (true);

-- Saved Prompts Policies
DROP POLICY IF EXISTS "Allow all operations for all users" ON saved_prompts;
CREATE POLICY "Allow all operations for all users" ON saved_prompts
  FOR ALL USING (true) WITH CHECK (true);

-- ===================================================================
-- 8. COMENTARIOS PARA DOCUMENTACIÓN
-- ===================================================================

COMMENT ON TABLE generated_images IS 'Imágenes generadas con modelos Replicate fine-tuned';
COMMENT ON TABLE combined_images IS 'Imágenes combinadas con Nano Banana (Gemini 2.5 Flash)';
COMMENT ON TABLE favorite_images IS 'Imágenes marcadas como favoritas por el usuario';
COMMENT ON TABLE user_uploads IS 'Imágenes subidas directamente por el usuario';
COMMENT ON TABLE saved_prompts IS 'Prompts guardados y reutilizables del usuario';

-- ===================================================================
-- 9. VERIFICACIÓN FINAL
-- ===================================================================

-- Verificar que todas las tablas se crearon correctamente
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('generated_images', 'combined_images', 'favorite_images', 'user_uploads', 'saved_prompts')
ORDER BY table_name;

-- ===================================================================
-- ✅ SETUP COMPLETO
-- ===================================================================

-- SIGUIENTE PASO: Crear Storage Bucket
-- Ve a: Storage > Buckets > Create Bucket
-- Nombre: "images"
-- Público: Sí
-- Folders sugeridas: generated/, combined/, favorites/, uploads/

SELECT 'SUPABASE DATABASE SETUP COMPLETED SUCCESSFULLY! 🎉' as status;