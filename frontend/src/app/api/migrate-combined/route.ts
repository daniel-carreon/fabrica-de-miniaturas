import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST() {
  try {
    console.log('🔄 Starting migration of combined images...')

    // Find all images that have "Combined:" in their prompt but are marked as is_combined: false
    const { data: combinedImages, error: fetchError } = await supabase
      .from('generated_images')
      .select('*')
      .ilike('prompt', 'Combined:%')
      .eq('is_combined', false)

    if (fetchError) {
      throw new Error(`Failed to fetch combined images: ${fetchError.message}`)
    }

    if (!combinedImages || combinedImages.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No combined images to migrate',
        migrated: 0
      })
    }

    console.log(`📦 Found ${combinedImages.length} combined images to migrate`)

    // Update all found images to is_combined: true
    const { error: updateError } = await supabase
      .from('generated_images')
      .update({ is_combined: true })
      .ilike('prompt', 'Combined:%')
      .eq('is_combined', false)

    if (updateError) {
      throw new Error(`Failed to update combined images: ${updateError.message}`)
    }

    console.log(`✅ Successfully migrated ${combinedImages.length} combined images`)

    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${combinedImages.length} combined images`,
      migrated: combinedImages.length,
      images: combinedImages.map(img => ({
        id: img.id,
        prompt: img.prompt,
        generated_at: img.generated_at
      }))
    })

  } catch (error) {
    console.error('❌ Migration failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to migrate combined images',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}