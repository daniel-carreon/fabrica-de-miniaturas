'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import GlassCard from '@/components/ui/glass-card'
import { LiquidButton } from '@/components/ui/liquid-glass-button'
import { Upload, Download, Maximize2, ArrowLeft, Trash2, Tag, FileImage, X } from 'lucide-react'

interface UserUpload {
  id: string
  filename: string
  public_url: string
  file_size: number
  mime_type: string
  uploaded_at: string
  description?: string
  tags: string[]
}

export default function MediaPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploads, setUploads] = useState<UserUpload[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  // Upload form state
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')

  useEffect(() => {
    loadUploads()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedImage) {
        setSelectedImage(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedImage])

  const loadUploads = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/uploads')
      const data = await response.json()

      if (response.ok) {
        setUploads(data.uploads || [])
      } else {
        console.error('Failed to load uploads:', data.error)
      }
    } catch (error) {
      console.error('Error loading uploads:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      handleUpload(file)
    } else {
      alert('Please select an image file')
    }
  }

  const handleUpload = async (file: File) => {
    try {
      setUploading(true)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('description', description)
      formData.append('tags', tags)

      console.log('📤 Uploading file:', file.name)

      const response = await fetch('/api/uploads', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        console.log('✅ Upload successful:', data.data)

        // Show success notification
        const notification = document.createElement('div')
        notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in'
        notification.textContent = '✅ Image uploaded successfully!'
        document.body.appendChild(notification)
        setTimeout(() => notification.remove(), 3000)

        // Clear form
        setDescription('')
        setTags('')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }

        // Reload uploads
        await loadUploads()
      } else {
        throw new Error(data.error || 'Upload failed')
      }
    } catch (error) {
      console.error('❌ Upload failed:', error)

      // Show error notification
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in'
      notification.textContent = `❌ ${error instanceof Error ? error.message : 'Upload failed'}`
      document.body.appendChild(notification)
      setTimeout(() => notification.remove(), 5000)
    } finally {
      setUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    const imageFile = files.find(file => file.type.startsWith('image/'))

    if (imageFile) {
      handleFileSelect(imageFile)
    } else {
      alert('Please drop an image file')
    }
  }

  const handleDownloadImage = async (upload: UserUpload) => {
    try {
      const response = await fetch(upload.public_url)
      const blob = await response.blob()

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = upload.filename

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download image:', error)
      alert('❌ Failed to download image')
    }
  }

  const handleDeleteUpload = async (uploadId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return

    try {
      const response = await fetch(`/api/uploads?id=${uploadId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setUploads(prev => prev.filter(upload => upload.id !== uploadId))

        // Show success notification
        const notification = document.createElement('div')
        notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in'
        notification.textContent = '✅ Image deleted successfully!'
        document.body.appendChild(notification)
        setTimeout(() => notification.remove(), 3000)
      } else {
        throw new Error('Failed to delete image')
      }
    } catch (error) {
      console.error('Error deleting upload:', error)
      alert('❌ Failed to delete image')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <LiquidButton
                onClick={() => router.push('/')}
                variant="space"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Generator
              </LiquidButton>
              <h1 className="text-4xl font-bold text-white">
                📤 Media Library
              </h1>
            </div>
            <LiquidButton
              onClick={loadUploads}
              variant="space"
              size="sm"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </LiquidButton>
          </div>
          <p className="text-gray-300 mt-2">
            Upload and manage your own images for combining and editing
          </p>
        </div>

        {/* Upload Section */}
        <GlassCard variant="dark" className="purple-glow mb-8">
          <h2 className="text-xl font-bold mb-6 text-white">
            📁 Upload New Image
          </h2>

          {/* Drag & Drop Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
              dragOver
                ? 'border-purple-400 bg-purple-500/10'
                : 'border-gray-500 hover:border-purple-400 hover:bg-purple-500/5'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <FileImage className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-white text-lg mb-2">
              {dragOver ? 'Drop your image here!' : 'Drag & drop an image here'}
            </p>
            <p className="text-gray-400 mb-4">or</p>

            <LiquidButton
              onClick={() => fileInputRef.current?.click()}
              variant="space"
              disabled={uploading}
              className="flex items-center gap-2 mx-auto"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Choose File'}
            </LiquidButton>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileSelect(file)
              }}
              className="hidden"
            />

            <p className="text-gray-500 text-sm mt-4">
              Supports: JPEG, PNG, WebP, GIF • Max size: 50MB
            </p>
          </div>

          {/* Upload Form */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-purple-200">
                Description (optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this image..."
                className="w-full px-3 py-2 bg-black/30 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-purple-200">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="portrait, headshot, professional..."
                className="w-full px-3 py-2 bg-black/30 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>
        </GlassCard>

        {/* Uploads Grid */}
        {loading ? (
          <GlassCard variant="dark" className="purple-glow">
            <div className="flex items-center justify-center py-12">
              <div className="text-white">Loading uploads...</div>
            </div>
          </GlassCard>
        ) : uploads.length === 0 ? (
          <GlassCard variant="dark" className="purple-glow">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📁</div>
              <h2 className="text-2xl font-bold text-white mb-2">No Uploads Yet</h2>
              <p className="text-gray-300 mb-6">
                Upload your first image to start building your media library!
              </p>
            </div>
          </GlassCard>
        ) : (
          <GlassCard variant="dark" className="purple-glow">
            <h2 className="text-xl font-bold mb-6 text-white">
              📚 Your Uploads ({uploads.length})
            </h2>

            <div className="image-grid">
              {uploads.map((upload) => (
                <div key={upload.id} className="image-card group relative">
                  <img
                    src={upload.public_url}
                    alt={upload.description || upload.filename}
                    className="w-full h-32 object-cover cursor-pointer hover:scale-105 transition-transform"
                    loading="lazy"
                    onClick={() => setSelectedImage(upload.public_url)}
                  />

                  {/* Hover icons */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="flex gap-1">
                      {/* Download */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownloadImage(upload)
                        }}
                        className="w-8 h-8 bg-black/70 hover:bg-black/90 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                        title="Download image"
                      >
                        <Download className="w-4 h-4 text-white" />
                      </button>

                      {/* Maximize */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedImage(upload.public_url)
                        }}
                        className="w-8 h-8 bg-black/70 hover:bg-black/90 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                        title="View fullscreen"
                      >
                        <Maximize2 className="w-4 h-4 text-white" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteUpload(upload.id)
                        }}
                        className="w-8 h-8 bg-black/70 hover:bg-red-600/90 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                        title="Delete image"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Image info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs truncate">
                      {upload.description || upload.filename}
                    </p>
                    <div className="flex items-center justify-between text-gray-300 text-xs mt-1">
                      <span>{formatFileSize(upload.file_size)}</span>
                      <span>{new Date(upload.uploaded_at).toLocaleDateString()}</span>
                    </div>
                    {upload.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Tag className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-400 text-xs truncate">
                          {upload.tags.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Image Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] w-full">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-4 -right-4 bg-purple-600 hover:bg-purple-700 text-white w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold transition-colors z-10"
              >
                ✕
              </button>
              <img
                src={selectedImage}
                alt="Upload fullscreen"
                className="w-full h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </div>

      {/* CSS Styles */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .image-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
        }

        .image-card {
          position: relative;
          border-radius: 0.75rem;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
        }
      `}</style>
    </div>
  )
}