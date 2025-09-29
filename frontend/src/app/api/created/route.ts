import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { processImagesToWebPStorage } from '../../../shared/lib/immediate-webp-storage'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface SaveCreatedRequest {
  images: Array<{
    id: string
    url: string
    prompt: string
    timestamp: number
  }>
  modelVersion?: string
  modelParameters?: any
  generationSession?: string
  toolUsed?: string
}

export async function POST(request: NextRequest) {
  try {
    const { images, modelVersion, modelParameters, generationSession, toolUsed }: SaveCreatedRequest = await request.json()

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: 'No created images provided' },
        { status: 400 }
      )
    }

    console.log('🎨 Auto-saving created images with IMMEDIATE WebP storage:', images.length)

    // Variables for tracking results
    let finalSavedImages: any[] = []
    let webpOptimizationStatus = 'processing'

    // 🚀 NUEVA ESTRATEGIA: Immediate WebP + Supabase Storage for Created Images
    try {
      console.log('🔄 Processing created images to WebP storage immediately...')

      const processedImages = await processImagesToWebPStorage(images, {
        type: 'created',
        metadata: {
          session: generationSession || `create_${Date.now()}`,
          tool_used: toolUsed || 'create_images'
        }
      })

      console.log(`✅ Created WebP processing completed: ${processedImages.length}/${images.length} images`)

      // Prepare data for batch insert with SUPABASE URLs (not temporary URLs)
      const imageData = processedImages.map(processedImage => ({
        image_id: processedImage.id,
        source_url: processedImage.original_url, // Keep original URL for reference
        supabase_url: processedImage.supabase_url, // PERMANENT URL
        creation_prompt: processedImage.prompt,
        model_used: 'gemini-2.5-flash', // Always Gemini for create_images
        creation_session: generationSession || `create_${Date.now()}`,
        created_at: new Date().toISOString(),
        tags: [],
        quality_score: null,
        webp_optimized: true, // ✅ ALREADY OPTIMIZED
        storage_folder: 'created/'
      }))

      // Batch insert to created_images table
      const { data: savedImages, error: dbError } = await supabase
        .from('created_images')
        .insert(imageData)
        .select()

      if (dbError) {
        console.error('❌ Database error:', dbError)
        throw new Error(`Database save failed: ${dbError.message}`)
      }

      console.log('✅ Successfully auto-saved created images with WebP optimization:', savedImages?.length)

      // Update tracking variables
      finalSavedImages = savedImages || []
      webpOptimizationStatus = 'completed'

    } catch (processError) {
      console.error('❌ Created WebP processing failed:', processError)

      // Fallback: save with temporary URLs if processing fails
      console.log('⚡ Fallback: saving created images with temporary URLs...')

      const fallbackImageData = images.map(image => ({
        image_id: image.id,
        source_url: image.url,
        supabase_url: null, // Will be processed later
        creation_prompt: image.prompt,
        model_used: 'gemini-2.5-flash',
        creation_session: generationSession || `create_${Date.now()}`,
        created_at: new Date().toISOString(),
        tags: [],
        quality_score: null,
        webp_optimized: false, // Not optimized yet
        storage_folder: 'created/'
      }))

      const { data: fallbackSavedImages, error: fallbackDbError } = await supabase
        .from('created_images')
        .insert(fallbackImageData)
        .select()

      if (fallbackDbError) {
        console.error('❌ Fallback database save also failed:', fallbackDbError)
        throw new Error(`Fallback save failed: ${fallbackDbError.message}`)
      }

      console.log('⚡ Fallback save completed:', fallbackSavedImages?.length)
      finalSavedImages = fallbackSavedImages || []
      webpOptimizationStatus = 'failed'
    }

    return NextResponse.json({
      success: true,
      data: {
        saved: finalSavedImages.length,
        images: finalSavedImages,
        optimization_status: webpOptimizationStatus,
        message: `Successfully saved ${finalSavedImages.length} created images`
      }
    })

  } catch (error) {
    console.error('❌ Failed to save created images:', error)
    return NextResponse.json(
      {
        error: 'Failed to save created images',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET method for retrieving created images
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const session = searchParams.get('session')

    let query = supabase
      .from('created_images')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (session) {
      query = query.eq('creation_session', session)
    }

    const { data: images, error, count } = await query

    if (error) {
      console.error('❌ Error fetching created images:', error)
      throw new Error(error.message)
    }

    const hasMore = offset + limit < (count || 0)

    return NextResponse.json({
      success: true,
      images: images || [],
      total: count || 0,
      hasMore,
      limit,
      offset
    })

  } catch (error) {
    console.error('❌ Failed to fetch created images:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch created images',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE method for removing created images
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('created_images')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('❌ Error deleting created image:', error)
      throw new Error(error.message)
    }

    return NextResponse.json({
      success: true,
      message: 'Created image deleted successfully'
    })

  } catch (error) {
    console.error('❌ Failed to delete created image:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete created image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}