import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface SavedPrompt {
  id?: string
  name: string
  prompt: string
  category: 'thumbnail' | 'portrait' | 'background' | 'custom'
  tags: string[]
  is_favorite?: boolean
  usage_count?: number
}

// GET - List saved prompts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const isFavorite = searchParams.get('favorite')
    const limit = parseInt(searchParams.get('limit') || '50')

    let query = supabase
      .from('saved_prompts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (category) {
      query = query.eq('category', category)
    }

    if (isFavorite === 'true') {
      query = query.eq('is_favorite', true)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch saved prompts: ${error.message}`)
    }

    return NextResponse.json({
      prompts: data || [],
      total: data?.length || 0
    })
  } catch (error) {
    console.error('❌ Fetch saved prompts failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch saved prompts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST - Create new saved prompt
export async function POST(request: NextRequest) {
  try {
    const { name, prompt, category, tags, is_favorite, user_id }: SavedPrompt & { user_id?: string | null } = await request.json()

    if (!name || !prompt || !category) {
      return NextResponse.json(
        { error: 'Name, prompt, and category are required' },
        { status: 400 }
      )
    }

    const promptData = {
      name,
      prompt,
      category,
      tags: tags || [],
      is_favorite: is_favorite || false,
      usage_count: 0,
      user_id: user_id // Allow null for public prompts
    }

    const { data, error } = await supabase
      .from('saved_prompts')
      .insert([promptData])
      .select()
      .single()

    if (error) {
      console.error('❌ Database error:', error)
      throw new Error(`Database save failed: ${error.message}`)
    }

    console.log('✅ Successfully created saved prompt:', data.id)

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    console.error('❌ Create saved prompt failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to create saved prompt',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT - Update saved prompt
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const promptId = searchParams.get('id')

    if (!promptId) {
      return NextResponse.json(
        { error: 'Prompt ID is required' },
        { status: 400 }
      )
    }

    const updateData = await request.json()

    const { data, error } = await supabase
      .from('saved_prompts')
      .update(updateData)
      .eq('id', promptId)
      .select()
      .single()

    if (error) {
      console.error('❌ Database error:', error)
      throw new Error(`Database update failed: ${error.message}`)
    }

    console.log('✅ Successfully updated saved prompt:', data.id)

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
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const promptId = searchParams.get('id')

    if (!promptId) {
      return NextResponse.json(
        { error: 'Prompt ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('saved_prompts')
      .delete()
      .eq('id', promptId)

    if (error) {
      console.error('❌ Database error:', error)
      throw new Error(`Database delete failed: ${error.message}`)
    }

    console.log('✅ Successfully deleted saved prompt:', promptId)

    return NextResponse.json({
      success: true,
      message: 'Prompt deleted successfully'
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