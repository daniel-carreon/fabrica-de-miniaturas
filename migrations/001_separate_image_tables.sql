-- 🗄️ SEPARACIÓN DE TABLAS: GENERATED vs COMBINED IMAGES
-- Migración para arquitectura WebP consistente
-- Daniel Carreon - Flux Context Project

-- ==========================================
-- STEP 1: LIMPIAR DATOS ANTIGUOS (FRESH START)
-- ==========================================

-- Eliminar datos existentes en generated_images
DELETE FROM generated_images;

-- ==========================================
-- STEP 2: RECREAR TABLA GENERATED_IMAGES ESPECIALIZADA
-- ==========================================

-- Eliminar tabla antigua si existe
DROP TABLE IF EXISTS generated_images CASCADE;

-- Crear nueva tabla solo para imágenes generadas
CREATE TABLE generated_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_id TEXT NOT NULL,
  replicate_url TEXT NOT NULL,
  supabase_url TEXT, -- WebP optimizado en Supabase Storage
  prompt TEXT NOT NULL,
  model_version TEXT,
  model_parameters JSONB DEFAULT '{}',
  generation_session TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  tags TEXT[] DEFAULT '{}',
  quality_score FLOAT,
  webp_optimized BOOLEAN DEFAULT false,
  storage_folder TEXT DEFAULT 'generated/',

  -- Indexes para performance
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- STEP 3: CREAR NUEVA TABLA COMBINED_IMAGES
-- ==========================================

-- Crear tabla especializada para imágenes combinadas
CREATE TABLE combined_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  image_id TEXT NOT NULL,
  source_url TEXT NOT NULL, -- URL original (OpenRouter/Nano Banana)
  supabase_url TEXT, -- WebP optimizado en Supabase Storage
  combination_prompt TEXT NOT NULL,
  source_images JSONB NOT NULL DEFAULT '[]', -- Referencias a imágenes padre
  model_used TEXT DEFAULT 'nano-banana',
  combination_session TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tags TEXT[] DEFAULT '{}',
  quality_score FLOAT,
  webp_optimized BOOLEAN DEFAULT false,
  storage_folder TEXT DEFAULT 'combined/'
);

-- ==========================================
-- STEP 4: INDEXES PARA PERFORMANCE ÓPTIMA
-- ==========================================

-- Generated Images Indexes
CREATE INDEX idx_generated_images_session ON generated_images(generation_session);
CREATE INDEX idx_generated_images_generated_at ON generated_images(generated_at DESC);
CREATE INDEX idx_generated_images_webp_optimized ON generated_images(webp_optimized);
CREATE INDEX idx_generated_images_prompt_search ON generated_images USING gin(to_tsvector('english', prompt));

-- Combined Images Indexes
CREATE INDEX idx_combined_images_session ON combined_images(combination_session);
CREATE INDEX idx_combined_images_created_at ON combined_images(created_at DESC);
CREATE INDEX idx_combined_images_webp_optimized ON combined_images(webp_optimized);
CREATE INDEX idx_combined_images_prompt_search ON combined_images USING gin(to_tsvector('english', combination_prompt));

-- ==========================================
-- STEP 5: RLS POLICIES (ROW LEVEL SECURITY)
-- ==========================================

-- Habilitar RLS en ambas tablas
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE combined_images ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para MVP (todos pueden leer/escribir)
CREATE POLICY "Enable all operations for all users" ON generated_images
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for all users" ON combined_images
  FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- STEP 6: COMENTARIOS PARA DOCUMENTACIÓN
-- ==========================================

COMMENT ON TABLE generated_images IS 'Tabla especializada para imágenes generadas con IA (Flux Dev + LoRA)';
COMMENT ON TABLE combined_images IS 'Tabla especializada para imágenes combinadas con Nano Banana';

COMMENT ON COLUMN generated_images.webp_optimized IS 'Flag indicating if image has been converted to WebP and stored in Supabase';
COMMENT ON COLUMN combined_images.webp_optimized IS 'Flag indicating if image has been converted to WebP and stored in Supabase';

COMMENT ON COLUMN generated_images.storage_folder IS 'Supabase Storage folder path for organization';
COMMENT ON COLUMN combined_images.storage_folder IS 'Supabase Storage folder path for organization';

-- ==========================================
-- ✅ MIGRACIÓN COMPLETADA
-- ==========================================

-- Verificar tablas creadas
SELECT
  'generated_images' as table_name,
  COUNT(*) as row_count
FROM generated_images
UNION ALL
SELECT
  'combined_images' as table_name,
  COUNT(*) as row_count
FROM combined_images;