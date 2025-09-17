import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    console.log('💾 Auto-saving generated images:', images.length)

    // Prepare data for batch insert
    const imageData = images.map(image => ({
      image_id: image.id,
      replicate_url: image.url,
      prompt: image.prompt,
      model_version: modelVersion || null,
      model_parameters: modelParameters || {},
      generation_session: generationSession || `session_${Date.now()}`,
      generated_at: new Date(image.timestamp).toISOString(),
      tags: [], // Default empty tags
      quality_score: null, // To be computed later
      is_combined: false, // Default for generated images
      parent_images: [] // Empty for original generations
    }))

    // Batch insert to database
    const { data: savedImages, error: dbError } = await supabase
      .from('generated_images')
      .insert(imageData)
      .select()

    if (dbError) {
      console.error('❌ Database error:', dbError)
      throw new Error(`Database save failed: ${dbError.message}`)
    }

    console.log('✅ Successfully auto-saved generated images:', savedImages?.length)

    return NextResponse.json({
      success: true,
      data: {
        saved: savedImages?.length || 0,
        session: generationSession || `session_${Date.now()}`,
        images: savedImages
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

    let query = supabase
      .from('generated_images')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(limit)

    if (session) {
      query = query.eq('generation_session', session)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch generated images: ${error.message}`)
    }

    return NextResponse.json({
      images: data || [],
      total: data?.length || 0
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