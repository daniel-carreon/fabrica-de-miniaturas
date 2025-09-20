/**
 * 🎨 WebP Optimizer - Auto-conversion de imágenes a formato WebP
 * Optimiza todas las imágenes para storage consistente en Supabase
 */

import { supabase } from './supabase'

interface OptimizeImageOptions {
  imageUrl: string
  imageId: string
  type: 'generated' | 'combined'
  metadata?: {
    prompt?: string
    session?: string
    sourceImages?: string[]
  }
}

interface OptimizedResult {
  success: boolean
  supabaseUrl?: string
  webpOptimized: boolean
  error?: string
}

/**
 * Convierte cualquier imagen a WebP y la sube a Supabase Storage
 */
export async function optimizeImageToWebP(options: OptimizeImageOptions): Promise<OptimizedResult> {
  try {
    console.log(`🎨 Iniciando optimización WebP para ${options.type}:`, options.imageId)

    // 1. Descargar imagen original
    const response = await fetch(options.imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }

    const originalBlob = await response.blob()
    console.log(`📥 Imagen descargada:`, {
      size: originalBlob.size,
      type: originalBlob.type
    })

    // 2. Convertir a WebP usando Canvas (browser-native)
    const webpBlob = await convertToWebP(originalBlob)
    console.log(`✨ Conversión WebP completada:`, {
      originalSize: originalBlob.size,
      webpSize: webpBlob.size,
      compression: Math.round((1 - webpBlob.size / originalBlob.size) * 100)
    })

    // 3. Determinar path de storage según tipo
    const storagePath = getStoragePath(options.type, options.imageId)
    console.log(`📁 Storage path:`, storagePath)

    // 4. Subir a Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload(storagePath, webpBlob, {
        contentType: 'image/webp',
        upsert: true
      })

    if (uploadError) {
      throw new Error(`Supabase upload failed: ${uploadError.message}`)
    }

    // 5. Obtener URL pública
    const { data: publicUrlData } = supabase.storage
      .from('images')
      .getPublicUrl(storagePath)

    const supabaseUrl = publicUrlData.publicUrl
    console.log(`✅ WebP optimizado subido:`, supabaseUrl)

    return {
      success: true,
      supabaseUrl,
      webpOptimized: true
    }

  } catch (error) {
    console.error(`❌ Error optimizando imagen:`, error)
    return {
      success: false,
      webpOptimized: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Convierte blob a WebP usando Canvas API
 */
async function convertToWebP(originalBlob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        // Crear canvas con dimensiones de la imagen
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          throw new Error('Canvas context not available')
        }

        // Dibujar imagen en canvas
        ctx.drawImage(img, 0, 0)

        // Convertir a WebP con calidad alta
        canvas.toBlob((webpBlob) => {
          if (webpBlob) {
            resolve(webpBlob)
          } else {
            reject(new Error('WebP conversion failed'))
          }
        }, 'image/webp', 0.9) // 90% quality for optimal compression

      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => reject(new Error('Failed to load image for conversion'))
    img.src = URL.createObjectURL(originalBlob)
  })
}

/**
 * Genera path de storage organizado por tipo
 */
function getStoragePath(type: 'generated' | 'combined', imageId: string): string {
  const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const randomSuffix = Math.random().toString(36).substr(2, 6)

  switch (type) {
    case 'generated':
      return `generated/webp/${timestamp}/${imageId}_${randomSuffix}.webp`
    case 'combined':
      return `combined/webp/${timestamp}/${imageId}_${randomSuffix}.webp`
    default:
      return `unknown/webp/${timestamp}/${imageId}_${randomSuffix}.webp`
  }
}

/**
 * Helper para limpiar URLs temporales (opcional)
 */
export function isTemporaryUrl(url: string): boolean {
  const temporaryDomains = [
    'replicate.delivery',
    'pbxt.replicate.delivery',
    'openrouter.ai',
    'api.openrouter.ai'
  ]

  return temporaryDomains.some(domain => url.includes(domain))
}

/**
 * Batch optimizer para múltiples imágenes
 */
export async function optimizeBatchToWebP(
  images: OptimizeImageOptions[]
): Promise<OptimizedResult[]> {
  console.log(`🚀 Iniciando optimización batch de ${images.length} imágenes`)

  const results = await Promise.allSettled(
    images.map(img => optimizeImageToWebP(img))
  )

  const optimizedResults = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      console.error(`❌ Error en imagen ${index}:`, result.reason)
      return {
        success: false,
        webpOptimized: false,
        error: result.reason?.message || 'Batch optimization failed'
      }
    }
  })

  const successCount = optimizedResults.filter(r => r.success).length
  console.log(`📊 Batch optimización completada: ${successCount}/${images.length} exitosas`)

  return optimizedResults
}