import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { processImagesToWebPStorage } from '../../../shared/lib/immediate-webp-storage'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface SaveGeneratedRequest {
  images: Array<{
    id: string
    url: string
    prompt: string
    timestamp: number
  }>
  modelVersion?: string
  modelParameters?: object
  generationSession?: string
}

export async function POST(request: NextRequest) {
  try {
    const { images, modelVersion, modelParameters, generationSession }: SaveGeneratedRequest = await request.json()

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'No images provided' },
        { status: 400 }
      )
    }

    console.log('💾 Auto-saving generated images with IMMEDIATE WebP storage:', images.length)

    // Variables for tracking results
    let finalSavedImages: any[] = []
    let webpOptimizationStatus = 'processing'

    // 🚀 NUEVA ESTRATEGIA: Immediate WebP + Supabase Storage
    try {
      console.log('🎨 Processing images to WebP storage immediately...')

      const processedImages = await processImagesToWebPStorage(images, {
        type: 'generated',
        metadata: {
          modelVersion: modelVersion || undefined,
          session: generationSession || `session_${Date.now()}`
        }
      })

      console.log(`✅ WebP processing completed: ${processedImages.length}/${images.length} images`)

      // Prepare data for batch insert with SUPABASE URLs (not temporary URLs)
      const imageData = processedImages.map(processedImage => ({
        image_id: processedImage.id,
        replicate_url: processedImage.original_url, // Keep for reference
        supabase_url: processedImage.supabase_url,  // PERMANENT URL
        prompt: processedImage.prompt,
        model_version: modelVersion || null,
        model_parameters: modelParameters || {},
        generation_session: generationSession || `session_${Date.now()}`,
        generated_at: new Date().toISOString(),
        tags: [],
        quality_score: null,
        webp_optimized: true, // ✅ ALREADY OPTIMIZED
        storage_folder: 'generated/'
      }))

      // Batch insert to generated_images table
      const { data: savedImages, error: dbError } = await supabase
        .from('generated_images')
        .insert(imageData)
        .select()

      if (dbError) {
        console.error('❌ Database error:', dbError)
        throw new Error(`Database save failed: ${dbError.message}`)
      }

      console.log('✅ Successfully auto-saved generated images with WebP optimization:', savedImages?.length)

      // Update tracking variables
      finalSavedImages = savedImages || []
      webpOptimizationStatus = 'completed'

    } catch (processError) {
      console.error('❌ WebP processing failed:', processError)

      // Fallback: save with temporary URLs if processing fails
      console.log('⚡ Fallback: saving with temporary URLs...')

      const fallbackImageData = images.map(image => ({
        image_id: image.id,
        replicate_url: image.url,
        supabase_url: null, // Will be processed later
        prompt: image.prompt,
        model_version: modelVersion || null,
        model_parameters: modelParameters || {},
        generation_session: generationSession || `session_${Date.now()}`,
        generated_at: new Date(image.timestamp).toISOString(),
        tags: [],
        quality_score: null,
        webp_optimized: false, // Will be processed in background
        storage_folder: 'generated/'
      }))

      const { data: fallbackSaved, error: fallbackError } = await supabase
        .from('generated_images')
        .insert(fallbackImageData)
        .select()

      if (fallbackError) {
        throw new Error(`Fallback save failed: ${fallbackError.message}`)
      }

      console.log('⚡ Fallback save completed:', fallbackSaved?.length)

      // Update tracking variables for fallback
      finalSavedImages = fallbackSaved || []
      webpOptimizationStatus = 'fallback'
    }

    return NextResponse.json({
      success: true,
      data: {
        saved: finalSavedImages.length,
        session: generationSession || `session_${Date.now()}`,
        images: finalSavedImages,
        webp_optimization: webpOptimizationStatus
      }
    })

  } catch (error) {
    console.error('❌ Auto-save failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to auto-save generated images',
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
      .from('generated_images')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(limit)

    if (session) {
      query = query.eq('generation_session', session)
    }

    if (webpOnly) {
      query = query.eq('webp_optimized', true)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch generated images: ${error.message}`)
    }

    // 🎨 Priorizar URLs WebP optimizadas cuando estén disponibles
    const optimizedImages = data?.map(image => ({
      ...image,
      display_url: image.supabase_url || image.replicate_url, // WebP first, fallback a original
      is_webp_optimized: image.webp_optimized,
      format: image.webp_optimized ? 'webp' : 'original'
    })) || []

    return NextResponse.json({
      images: optimizedImages,
      total: optimizedImages.length,
      webp_optimized_count: optimizedImages.filter(img => img.webp_optimized).length
    })
  } catch (error) {
    console.error('❌ Fetch generated images failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch generated images',
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

    // Delete from database (we don't delete from Replicate as we don't own those URLs)
    const { error: dbError } = await supabase
      .from('generated_images')
      .delete()
      .eq('id', imageId)

    if (dbError) {
      console.error('❌ Database delete error:', dbError)
      throw new Error(`Database delete failed: ${dbError.message}`)
    }

    console.log('✅ Successfully deleted generated image:', imageId)

    return NextResponse.json({
      success: true,
      message: 'Generated image deleted successfully'
    })

  } catch (error) {
    console.error('❌ Delete generated image failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete generated image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}