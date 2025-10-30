import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface ImageRecord {
  id: string
  supabase_url?: string
  replicate_url?: string
  source_url?: string
  original_url?: string
  prompt?: string
  combination_prompt?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get('id')
    const source = searchParams.get('source') // 'generated', 'combined', 'favorites'

    if (!imageId) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      )
    }

    console.log(`🔽 Download request: imageId=${imageId}, source=${source}`)

    // Determine which table to query based on source
    let tableName: string
    let urlField: string
    let promptField: string

    switch (source) {
      case 'generated':
        tableName = 'generated_images'
        urlField = 'supabase_url'
        promptField = 'prompt'
        break
      case 'combined':
        tableName = 'combined_images'
        urlField = 'supabase_url'
        promptField = 'combination_prompt'
        break
      case 'favorites':
        tableName = 'favorite_images'
        urlField = 'supabase_url'
        promptField = 'prompt'
        break
      default:
        // Fallback: try all tables
        tableName = 'generated_images'
        urlField = 'supabase_url'
        promptField = 'prompt'
    }

    // Query the database to get the WebP URL
    const { data: imageData, error } = await supabase
      .from(tableName)
      .select(`id, ${urlField}, ${promptField}`)
      .eq('id', imageId)
      .single()

    if (error || !imageData) {
      console.error(`❌ Image not found in ${tableName}:`, error)

      // If not found and no specific source, try other tables
      if (!source) {
        const tables = [
          { name: 'combined_images', url: 'supabase_url', prompt: 'combination_prompt' },
          { name: 'favorite_images', url: 'supabase_url', prompt: 'prompt' }
        ]

        for (const table of tables) {
          const { data, error } = await supabase
            .from(table.name)
            .select(`id, ${table.url}, ${table.prompt}`)
            .eq('id', imageId)
            .single()

          if (data && !error) {
            const record = data as unknown as Record<string, unknown>
            const webpUrl = record[table.url] as string | undefined
            const fallbackPrompt = (record[table.prompt] as string | undefined) || 'image'

            if (webpUrl) {
              return await processImageDownload(webpUrl, fallbackPrompt, imageId)
            }
          }
        }
      }

      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      )
    }

    const imageRecord = imageData as unknown as Record<string, unknown>
    const webpUrl = imageRecord[urlField] as string | undefined
    const prompt = (imageRecord[promptField] as string | undefined) || 'image'

    if (!webpUrl) {
      return NextResponse.json(
        { error: 'Image URL not available' },
        { status: 404 }
      )
    }

    return await processImageDownload(webpUrl, prompt, imageId)

  } catch (error) {
    console.error('❌ Download endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function processImageDownload(webpUrl: string, prompt: string, imageId: string) {
  try {
    console.log(`🔄 Processing download: ${webpUrl}`)

    // Fetch the WebP image
    const imageResponse = await fetch(webpUrl)
    if (!imageResponse.ok) {
      console.error(`❌ Failed to fetch image: ${imageResponse.status}`)
      return NextResponse.json(
        { error: 'Failed to fetch image from storage' },
        { status: 500 }
      )
    }

    const imageBuffer = await imageResponse.arrayBuffer()

    // Create a safe filename from prompt
    const safePrompt = prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')         // Replace spaces with dashes
      .substring(0, 30)             // Limit length

    const filename = `dani-miniatura-${safePrompt}-${imageId.substring(0, 8)}.png`

    console.log(`✅ Converting WebP → PNG and serving: ${filename}`)

    // Convert WebP → PNG (lossless, better for design tools like Canva)
    const pngBuffer = await sharp(Buffer.from(imageBuffer))
      .png({
        effort: 9,  // ZLIB compression level (0-10) for file size optimization
        force: true  // Force PNG format
      })
      .toBuffer()

    console.log(`📊 Original size: ${imageBuffer.byteLength} bytes, PNG size: ${pngBuffer.byteLength} bytes`)

    return new NextResponse(new Uint8Array(pngBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })

  } catch (error) {
    console.error('❌ Error processing image download:', error)
    return NextResponse.json(
      { error: 'Failed to process image download' },
      { status: 500 }
    )
  }
}
