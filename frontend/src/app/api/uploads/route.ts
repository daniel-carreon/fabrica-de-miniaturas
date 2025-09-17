import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const description = formData.get('description') as string || ''
    const tags = formData.get('tags') as string || ''

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      )
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 50MB' },
        { status: 400 }
      )
    }

    console.log('📤 Uploading file:', {
      name: file.name,
      type: file.type,
      size: file.size
    })

    // Generate unique filename
    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop()
    const uniqueFileName = `${timestamp}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`
    const storagePath = `uploads/${uniqueFileName}`

    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer()

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-uploads')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('❌ Upload error:', uploadError)
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('user-uploads')
      .getPublicUrl(storagePath)

    const publicUrl = publicUrlData.publicUrl

    // Get image dimensions (simple approach)
    let dimensions = {}
    try {
      // This is basic - in production you'd use a proper image library
      // For now, we'll just store what the browser provides
      dimensions = {
        width: 0,
        height: 0,
        note: 'Dimensions detection not implemented yet'
      }
    } catch (error) {
      console.warn('Could not extract image dimensions:', error)
    }

    // Parse tags
    const tagsArray = tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)

    // Save to database
    const { data: dbData, error: dbError } = await supabase
      .from('user_uploads')
      .insert({
        filename: file.name,
        storage_path: storagePath,
        public_url: publicUrl,
        file_size: file.size,
        mime_type: file.type,
        original_dimensions: dimensions,
        description: description,
        tags: tagsArray
      })
      .select()
      .single()

    if (dbError) {
      console.error('❌ Database error:', dbError)
      // Try to cleanup uploaded file
      await supabase.storage
        .from('user-uploads')
        .remove([storagePath])

      throw new Error(`Database save failed: ${dbError.message}`)
    }

    console.log('✅ Successfully uploaded and saved file')

    return NextResponse.json({
      success: true,
      data: {
        id: dbData.id,
        filename: dbData.filename,
        publicUrl: dbData.public_url,
        fileSize: dbData.file_size,
        mimeType: dbData.mime_type,
        uploadedAt: dbData.uploaded_at,
        description: dbData.description,
        tags: dbData.tags
      }
    })

  } catch (error) {
    console.error('❌ Upload failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('user_uploads')
      .select('*')
      .order('uploaded_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch uploads: ${error.message}`)
    }

    return NextResponse.json({
      uploads: data || []
    })
  } catch (error) {
    console.error('❌ Fetch uploads failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch uploads',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const uploadId = searchParams.get('id')

    if (!uploadId) {
      return NextResponse.json(
        { error: 'Upload ID is required' },
        { status: 400 }
      )
    }

    // Get upload info first
    const { data: upload, error: fetchError } = await supabase
      .from('user_uploads')
      .select('storage_path')
      .eq('id', uploadId)
      .single()

    if (fetchError) {
      console.error('❌ Error fetching upload:', fetchError)
      return NextResponse.json(
        { error: 'Upload not found' },
        { status: 404 }
      )
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('user_uploads')
      .delete()
      .eq('id', uploadId)

    if (dbError) {
      console.error('❌ Database delete error:', dbError)
      throw new Error(`Database delete failed: ${dbError.message}`)
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('user-uploads')
      .remove([upload.storage_path])

    if (storageError) {
      console.warn('⚠️ Storage delete warning:', storageError.message)
      // Don't fail the entire operation if storage delete fails
    }

    console.log('✅ Successfully deleted upload:', uploadId)

    return NextResponse.json({
      success: true,
      message: 'Upload deleted successfully'
    })

  } catch (error) {
    console.error('❌ Delete upload failed:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete upload',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}