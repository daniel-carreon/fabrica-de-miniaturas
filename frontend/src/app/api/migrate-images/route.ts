import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { processImagesToWebPStorage } from '../../../shared/lib/immediate-webp-storage'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting migration of existing images...')

    // 1. Fetch images that need migration
    const { data: imagesToMigrate, error: fetchError } = await supabase
      .from('generated_images')
      .select('*')
      .or('supabase_url.is.null,webp_optimized.eq.false')
      .order('generated_at', { ascending: false })

    if (fetchError) {
      throw new Error(`Failed to fetch images: ${fetchError.message}`)
    }

    if (!imagesToMigrate || imagesToMigrate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No images to migrate - all already optimized!',
        migrated: 0
      })
    }

    console.log(`📊 Found ${imagesToMigrate.length} images to migrate`)

    // 2. Check URL validity
    const validImages = []
    const brokenUrls = []

    for (const img of imagesToMigrate) {
      try {
        const response = await fetch(img.replicate_url, { method: 'HEAD', timeout: 10000 })
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
      return NextResponse.json({
        success: false,
        message: 'No valid URLs found - all images have expired',
        migrated: 0,
        expired: brokenUrls.length,
        expiredIds: brokenUrls
      })
    }

    // 3. Process valid images
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

    // 4. Update database records
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

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      migrated: successfulUpdates.length,
      processed: processedImages.length,
      expired: brokenUrls.length,
      expiredIds: brokenUrls,
      successfulIds: successfulUpdates
    })

  } catch (error) {
    console.error('💥 Migration failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Get migration status
    const { data: totalImages, error: totalError } = await supabase
      .from('generated_images')
      .select('id, webp_optimized, supabase_url')

    if (totalError) {
      throw new Error(`Failed to get status: ${totalError.message}`)
    }

    const total = totalImages?.length || 0
    const optimized = totalImages?.filter(img => img.webp_optimized && img.supabase_url).length || 0
    const needsMigration = total - optimized

    return NextResponse.json({
      total,
      optimized,
      needsMigration,
      completionRate: total > 0 ? Math.round((optimized / total) * 100) : 100
    })

  } catch (error) {
    console.error('❌ Status check failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to get migration status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}