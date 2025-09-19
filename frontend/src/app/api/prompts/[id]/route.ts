import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface SavedPrompt {
  name?: string
  prompt?: string
  category?: 'thumbnail' | 'portrait' | 'background' | 'custom'
  tags?: string[]
  is_favorite?: boolean
}

// PUT - Update saved prompt
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params
    const { id } = resolvedParams
    const updates: SavedPrompt = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Prompt ID is required' },
        { status: 400 }
      )
    }

    // Increment usage count if this is a "use" action
    const isUsageUpdate = Object.keys(updates).length === 0
    if (isUsageUpdate) {
      // First get current count
      const { data: current, error: fetchError } = await supabase
        .from('saved_prompts')
        .select('usage_count')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError

      // Then update with incremented count
      const { data, error } = await supabase
        .from('saved_prompts')
        .update({ usage_count: (current?.usage_count || 0) + 1 })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to increment usage: ${error.message}`)
      }

      return NextResponse.json({
        success: true,
        data
      })
    }

    // Regular update
    const { data, error } = await supabase
      .from('saved_prompts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ Database update error:', error)
      throw new Error(`Database update failed: ${error.message}`)
    }

    console.log('✅ Successfully updated saved prompt:', id)

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    console.error('❌ Update saved prompt failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to update saved prompt',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE - Delete saved prompt
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  try {
    const { id } = resolvedParams

    if (!id) {
      return NextResponse.json(
        { error: 'Prompt ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('saved_prompts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('❌ Database delete error:', error)
      throw new Error(`Database delete failed: ${error.message}`)
    }

    console.log('✅ Successfully deleted saved prompt:', id)

    return NextResponse.json({
      success: true,
      message: 'Saved prompt deleted successfully'
    })

  } catch (error) {
    console.error('❌ Delete saved prompt failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete saved prompt',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}