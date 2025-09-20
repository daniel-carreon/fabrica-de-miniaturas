import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { processImagesToWebPStorage } from '../../../shared/lib/immediate-webp-storage'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface SaveCombinedRequest {
  images: Array<{
    id: string
    url: string
    prompt: string
    timestamp: number
  }>
  sourceImages?: Array<{
    id: string
    url: string
  }>
  combinationSession?: string
  modelUsed?: string
}

export async function POST(request: NextRequest) {
  try {
    const { images, sourceImages, combinationSession, modelUsed }: SaveCombinedRequest = await request.json()

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'No combined images provided' },
        { status: 400 }
      )
    }

    console.log('🎨 Auto-saving combined images with IMMEDIATE WebP storage:', images.length)

    // Variables for tracking results
    let finalSavedImages: any[] = []
    let webpOptimizationStatus = 'processing'

    // 🚀 NUEVA ESTRATEGIA: Immediate WebP + Supabase Storage for Combined Images
    try {
      console.log('🔄 Processing combined images to WebP storage immediately...')

      const processedImages = await processImagesToWebPStorage(images, {
        type: 'combined',
        metadata: {
          session: combinationSession || `combine_${Date.now()}`,
          sourceImages: sourceImages?.map(img => img.id) || []
        }
      })

      console.log(`✅ Combined WebP processing completed: ${processedImages.length}/${images.length} images`)

      // Prepare data for batch insert with SUPABASE URLs (not temporary URLs)
      const imageData = processedImages.map(processedImage => ({
        image_id: processedImage.id,
        source_url: processedImage.original_url, // Keep original URL for reference
        supabase_url: processedImage.supabase_url, // PERMANENT URL
        combination_prompt: processedImage.prompt,
        source_images: sourceImages || [],
        model_used: modelUsed || 'nano-banana',
        combination_session: combinationSession || `combine_${Date.now()}`,
        created_at: new Date().toISOString(),
        tags: [],
        quality_score: null,
        webp_optimized: true, // ✅ ALREADY OPTIMIZED
        storage_folder: 'combined/'
      }))

      // Batch insert to combined_images table
      const { data: savedImages, error: dbError } = await supabase
        .from('combined_images')
        .insert(imageData)
        .select()

      if (dbError) {
        console.error('❌ Database error:', dbError)
        throw new Error(`Database save failed: ${dbError.message}`)
      }

      console.log('✅ Successfully auto-saved combined images with WebP optimization:', savedImages?.length)

      // Update tracking variables
      finalSavedImages = savedImages || []
      webpOptimizationStatus = 'completed'

    } catch (processError) {
      console.error('❌ Combined WebP processing failed:', processError)

      // Fallback: save with temporary URLs if processing fails
      console.log('⚡ Fallback: saving combined images with temporary URLs...')

      const fallbackImageData = images.map(image => ({
        image_id: image.id,
        source_url: image.url,
        supabase_url: null, // Will be processed later
        combination_prompt: image.prompt,
        source_images: sourceImages || [],
        model_used: modelUsed || 'nano-banana',
        combination_session: combinationSession || `combine_${Date.now()}`,
        created_at: new Date(image.timestamp).toISOString(),
        tags: [],
        quality_score: null,
        webp_optimized: false, // Will be processed in background
        storage_folder: 'combined/'
      }))

      const { data: fallbackSaved, error: fallbackError } = await supabase
        .from('combined_images')
        .insert(fallbackImageData)
        .select()

      if (fallbackError) {
        throw new Error(`Fallback save failed: ${fallbackError.message}`)
      }

      console.log('⚡ Combined fallback save completed:', fallbackSaved?.length)

      // Update tracking variables for fallback
      finalSavedImages = fallbackSaved || []
      webpOptimizationStatus = 'fallback'
    }

    return NextResponse.json({
      success: true,
      data: {
        saved: finalSavedImages.length,
        session: combinationSession || `combine_${Date.now()}`,
        images: finalSavedImages,
        webp_optimization: webpOptimizationStatus
      }
    })

  } catch (error) {
    console.error('❌ Auto-save combined images failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to auto-save combined images',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const session = searchParams.get('session')
    const webpOnly = searchParams.get('webp_only') === 'true'

    let query = supabase
      .from('combined_images')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (session) {
      query = query.eq('combination_session', session)
    }

    if (webpOnly) {
      query = query.eq('webp_optimized', true)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch combined images: ${error.message}`)
    }

    // 🎨 Priorizar URLs WebP optimizadas cuando estén disponibles
    const optimizedImages = data?.map(image => ({
      ...image,
      display_url: image.supabase_url || image.source_url, // WebP first, fallback a original
      is_webp_optimized: image.webp_optimized,
      format: image.webp_optimized ? 'webp' : 'original'
    })) || []

    return NextResponse.json({
      images: optimizedImages,
      total: optimizedImages.length,
      webp_optimized_count: optimizedImages.filter(img => img.webp_optimized).length
    })
  } catch (error) {
    console.error('❌ Fetch combined images failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch combined images',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('id')

    if (!imageId) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      )
    }

    // Get image info first to clean up storage
    const { data: image, error: fetchError } = await supabase
      .from('combined_images')
      .select('supabase_url, storage_folder')
      .eq('id', imageId)
      .single()

    if (fetchError) {
      console.error('❌ Error fetching combined image:', fetchError)
      return NextResponse.json(
        { error: 'Combined image not found' },
        { status: 404 }
      )
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('combined_images')
      .delete()
      .eq('id', imageId)

    if (dbError) {
      console.error('❌ Database delete error:', dbError)
      throw new Error(`Database delete failed: ${dbError.message}`)
    }

    // Clean up Supabase Storage if WebP was created
    if (image.supabase_url) {
      try {
        const urlPath = new URL(image.supabase_url).pathname
        const storagePath = urlPath.replace('/storage/v1/object/public/images/', '')

        await supabase.storage
          .from('images')
          .remove([storagePath])

        console.log('🗑️ Cleaned up WebP storage for:', storagePath)
      } catch (storageError) {
        console.warn('⚠️ Storage cleanup warning:', storageError)
        // Don't fail the entire operation if storage cleanup fails
      }
    }

    console.log('✅ Successfully deleted combined image:', imageId)

    return NextResponse.json({
      success: true,
      message: 'Combined image deleted successfully'
    })

  } catch (error) {
    console.error('❌ Delete combined image failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete combined image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}