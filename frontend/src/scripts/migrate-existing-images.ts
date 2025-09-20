/**
 * 🔄 Migration Script - Migrar imágenes existentes a WebP Storage
 * Convierte las 11 imágenes con URLs temporales a storage permanente
 */

import { createClient } from '@supabase/supabase-js'
import { processImagesToWebPStorage } from '../shared/lib/immediate-webp-storage'

// Configuración Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface ExistingImage {
  id: string
  image_id: string
  replicate_url: string
  prompt: string
  supabase_url: string | null
  webp_optimized: boolean
  generated_at: string
}

/**
 * Main migration function
 */
export async function migrateExistingImages() {
  try {
    console.log('🔄 Starting migration of existing images...')

    // 1. Fetch images that need migration (no supabase_url or webp_optimized = false)
    const { data: imagesToMigrate, error: fetchError } = await supabase
      .from('generated_images')
      .select('*')
      .or('supabase_url.is.null,webp_optimized.eq.false')
      .order('generated_at', { ascending: false })

    if (fetchError) {
      throw new Error(`Failed to fetch images: ${fetchError.message}`)
    }

    if (!imagesToMigrate || imagesToMigrate.length === 0) {
      console.log('✅ No images to migrate - all already optimized!')
      return { migrated: 0, errors: [] }
    }

    console.log(`📊 Found ${imagesToMigrate.length} images to migrate`)

    // 2. Filter out images with broken/expired URLs
    const validImages = []
    const brokenUrls = []

    for (const img of imagesToMigrate) {
      try {
        const response = await fetch(img.replicate_url, { method: 'HEAD' })
        if (response.ok) {
          validImages.push(img)
          console.log(`✅ URL válida: ${img.image_id}`)
        } else {
          brokenUrls.push(img.image_id)
          console.warn(`❌ URL expirada: ${img.image_id} (${response.status})`)
        }
      } catch (error) {
        brokenUrls.push(img.image_id)
        console.warn(`❌ URL inaccessible: ${img.image_id}`)
      }
    }

    console.log(`📈 Migration candidates: ${validImages.length} valid, ${brokenUrls.length} expired`)

    if (validImages.length === 0) {
      console.log('❌ No valid URLs found - all images have expired')
      return { migrated: 0, errors: brokenUrls, expired: brokenUrls.length }
    }

    // 3. Process valid images to WebP storage
    const imagesToProcess = validImages.map(img => ({
      id: img.image_id,
      url: img.replicate_url,
      prompt: img.prompt,
      timestamp: new Date(img.generated_at).getTime()
    }))

    console.log('🎨 Processing images to WebP storage...')

    const processedImages = await processImagesToWebPStorage(imagesToProcess, {
      type: 'generated',
      metadata: {
        session: 'migration_batch'
      }
    })

    console.log(`✅ WebP processing completed: ${processedImages.length}/${imagesToProcess.length} images`)

    // 4. Update database records with new URLs
    const updatePromises = processedImages.map(async (processedImg) => {
      try {
        const { error: updateError } = await supabase
          .from('generated_images')
          .update({
            supabase_url: processedImg.supabase_url,
            webp_optimized: true
          })
          .eq('image_id', processedImg.id)

        if (updateError) {
          throw new Error(`Failed to update ${processedImg.id}: ${updateError.message}`)
        }

        console.log(`✅ Updated database record: ${processedImg.id}`)
        return { success: true, id: processedImg.id }

      } catch (error) {
        console.error(`❌ Update failed for ${processedImg.id}:`, error)
        return { success: false, id: processedImg.id, error: error.message }
      }
    })

    const updateResults = await Promise.allSettled(updatePromises)
    const successfulUpdates = updateResults
      .filter(result => result.status === 'fulfilled' && result.value.success)
      .map(result => result.value.id)

    console.log(`📊 Database updates: ${successfulUpdates.length}/${processedImages.length} successful`)

    // 5. Summary
    const migrationSummary = {
      migrated: successfulUpdates.length,
      processed: processedImages.length,
      expired: brokenUrls.length,
      errors: brokenUrls,
      successful_ids: successfulUpdates
    }

    console.log('🎉 Migration completed!')
    console.log('📊 Summary:', migrationSummary)

    return migrationSummary

  } catch (error) {
    console.error('💥 Migration failed:', error)
    throw error
  }
}

/**
 * Cleanup function to remove expired URL records
 */
export async function cleanupExpiredImages(expiredIds: string[]) {
  if (expiredIds.length === 0) return

  console.log(`🗑️ Cleaning up ${expiredIds.length} expired image records...`)

  try {
    const { error } = await supabase
      .from('generated_images')
      .delete()
      .in('image_id', expiredIds)

    if (error) {
      throw new Error(`Cleanup failed: ${error.message}`)
    }

    console.log('✅ Expired records cleaned up successfully')
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
  }
}

/**
 * Run migration if called directly
 */
if (require.main === module) {
  migrateExistingImages()
    .then(result => {
      console.log('🎉 Migration script completed:', result)
      if (result.expired > 0) {
        console.log('⚠️ Consider running cleanup for expired images')
      }
      process.exit(0)
    })
    .catch(error => {
      console.error('💥 Migration script failed:', error)
      process.exit(1)
    })
}