import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const favoriteId = resolvedParams.id

    if (!favoriteId) {
      return NextResponse.json(
        { error: 'Favorite ID is required' },
        { status: 400 }
      )
    }

    // First, get the favorite to check if it has a Supabase file to delete
    const { data: favorite, error: fetchError } = await supabase
      .from('favorite_images')
      .select('supabase_url, image_id')
      .eq('id', favoriteId)
      .single()

    if (fetchError) {
      console.error('❌ Error fetching favorite:', fetchError)
      return NextResponse.json(
        { error: 'Failed to find favorite' },
        { status: 404 }
      )
    }

    // Delete from database first
    const { error: dbError } = await supabase
      .from('favorite_images')
      .delete()
      .eq('id', favoriteId)

    if (dbError) {
      console.error('❌ Database delete error:', dbError)
      throw new Error(`Database delete failed: ${dbError.message}`)
    }

    // If there's a Supabase file, delete it from storage
    if (favorite.supabase_url) {
      const fileName = `favorites/${favorite.image_id}.webp`
      const { error: storageError } = await supabase.storage
        .from('images')
        .remove([fileName])

      if (storageError) {
        console.warn('⚠️ Storage delete warning:', storageError.message)
        // Don't fail the entire operation if storage delete fails
      }
    }

    console.log('✅ Successfully deleted favorite:', favoriteId)

    return NextResponse.json({
      success: true,
      message: 'Favorite deleted successfully'
    })

  } catch (error) {
    console.error('❌ Delete favorite failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete favorite',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}