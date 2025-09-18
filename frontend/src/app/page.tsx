'use client'

import { useState, useEffect, useRef } from 'react'
import { useImageStore } from '@/shared/stores/imageStore'
import GlassCard from '@/components/ui/glass-card'
import { LiquidButton } from '@/components/ui/liquid-glass-button'
import { Download, Maximize2, Heart, Upload, FileImage, Trash2, Tag, Clock } from 'lucide-react'
import ImageCard from '@/components/ui/ImageCard'
import { useSelectedImages } from '@/shared/contexts/SelectedImagesContext'

interface ApiResponse {
  images: Array<{
    id: string
    url: string
    prompt: string
    timestamp: number
  }>
  total: number
  prompt: string
}

interface FavoriteImage {
  id: string
  image_id: string
  original_url: string
  supabase_url: string
  prompt: string
  saved_at: string
  created_at: string
}

interface GeneratedImage {
  id: string
  image_id: string
  replicate_url: string
  prompt: string
  model_version?: string
  model_parameters?: any
  generation_session: string
  generated_at: string
  tags: string[]
  quality_score?: number
  is_combined: boolean
}

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

export default function HomePage() {
  const [prompt, setPrompt] = useState('')
  const [numImages, setNumImages] = useState(10)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  // Panel toggles
  const [showGeneratedPanel, setShowGeneratedPanel] = useState(true)
  const [showFavoritesPanel, setShowFavoritesPanel] = useState(true)
  const [showUploadsPanel, setShowUploadsPanel] = useState(true)

  // Data states
  const [favorites, setFavorites] = useState<FavoriteImage[]>([])
  const [generatedHistory, setGeneratedHistory] = useState<GeneratedImage[]>([])
  const [uploads, setUploads] = useState<UserUpload[]>([])
  const [loading, setLoading] = useState({ favorites: false, generated: false, uploads: false })

  // Upload states
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Image selection from context
  const { selectedImages, handleImageSelect, isImageSelected, clearSelection, maxSelection } = useSelectedImages()

  const {
    isGenerating,
    generatedImages,
    setGenerating,
    setGeneratedImages,
    clearGenerated,
    toggleImageSelection,
    getSelectedImages
  } = useImageStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedImage) {
        setSelectedImage(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedImage])

  // Load all data on component mount
  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    await Promise.all([
      loadFavorites(),
      loadGeneratedHistory(),
      loadUploads()
    ])
  }

  const loadFavorites = async () => {
    try {
      setLoading(prev => ({ ...prev, favorites: true }))
      const response = await fetch('/api/favorites')
      const data = await response.json()
      if (response.ok) {
        setFavorites(data.favorites || [])
      }
    } catch (error) {
      console.error('Error loading favorites:', error)
    } finally {
      setLoading(prev => ({ ...prev, favorites: false }))
    }
  }

  const loadGeneratedHistory = async () => {
    try {
      setLoading(prev => ({ ...prev, generated: true }))
      const response = await fetch('/api/generated?limit=50')
      const data = await response.json()
      if (response.ok) {
        setGeneratedHistory(data.images || [])
      }
    } catch (error) {
      console.error('Error loading generated history:', error)
    } finally {
      setLoading(prev => ({ ...prev, generated: false }))
    }
  }

  const loadUploads = async () => {
    try {
      setLoading(prev => ({ ...prev, uploads: true }))
      const response = await fetch('/api/uploads')
      const data = await response.json()
      if (response.ok) {
        setUploads(data.uploads || [])
      }
    } catch (error) {
      console.error('Error loading uploads:', error)
    } finally {
      setLoading(prev => ({ ...prev, uploads: false }))
    }
  }

  const handleSaveFavorite = async (image: { id: string; url: string; prompt: string }) => {
    try {
      console.log('💾 Saving to favorites:', image.id)

      // Show loading state
      const originalButton = document.querySelector(`[title="Save to favorites"]`) as HTMLButtonElement
      if (originalButton) {
        originalButton.disabled = true
        originalButton.style.opacity = '0.5'
      }

      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageId: image.id,
          originalUrl: image.url,
          prompt: image.prompt,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // More detailed error handling
        let errorMessage = 'Failed to save favorite'

        if (response.status === 400) {
          errorMessage = 'Invalid image data'
        } else if (response.status === 413) {
          errorMessage = 'Image too large'
        } else if (response.status === 500) {
          errorMessage = data.details || 'Server error occurred'
        } else {
          errorMessage = data.error || `Error ${response.status}`
        }

        throw new Error(errorMessage)
      }

      console.log('✅ Successfully saved to favorites:', data)

      // Success feedback with better UX
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in'
      notification.textContent = '✅ Saved to favorites!'
      document.body.appendChild(notification)

      // Auto-remove notification
      setTimeout(() => {
        notification.remove()
      }, 3000)

    } catch (error) {
      console.error('❌ Failed to save favorite:', error)

      // Error feedback with better UX
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in'
      notification.textContent = `❌ ${error instanceof Error ? error.message : 'Failed to save'}`
      document.body.appendChild(notification)

      // Auto-remove notification
      setTimeout(() => {
        notification.remove()
      }, 5000)

    } finally {
      // Reset button state
      const originalButton = document.querySelector(`[title="Save to favorites"]`) as HTMLButtonElement
      if (originalButton) {
        originalButton.disabled = false
        originalButton.style.opacity = '1'
      }
    }
  }

  const handleUpload = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    try {
      setUploading(true)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('description', description)
      formData.append('tags', tags)

      const response = await fetch('/api/uploads', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        setDescription('')
        setTags('')
        if (fileInputRef.current) fileInputRef.current.value = ''
        await loadUploads()

        const notification = document.createElement('div')
        notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in'
        notification.textContent = '✅ Image uploaded successfully!'
        document.body.appendChild(notification)
        setTimeout(() => notification.remove(), 3000)
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }
    } catch (error) {
      console.error('❌ Upload failed:', error)
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
    if (imageFile) handleUpload(imageFile)
  }

  const handleDeleteUpload = async (uploadId: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return

    try {
      const response = await fetch(`/api/uploads?id=${uploadId}`, { method: 'DELETE' })
      if (response.ok) {
        await loadUploads()
        const notification = document.createElement('div')
        notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in'
        notification.textContent = '✅ Image deleted successfully!'
        document.body.appendChild(notification)
        setTimeout(() => notification.remove(), 3000)
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

  // Image selection functions now come from context

  const handleDownloadImage = async (image: { id: string; url: string; prompt: string }) => {
    try {
      console.log('⬇️ Downloading image:', image.id)

      // Fetch the image from the URL
      const response = await fetch(image.url)
      const blob = await response.blob()

      // Create a download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      // Create a filename based on the prompt (cleaned up)
      const cleanPrompt = image.prompt.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)
      link.download = `dani_${cleanPrompt}_${image.id}.webp`

      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up
      window.URL.revokeObjectURL(url)

      console.log('✅ Image downloaded successfully')
    } catch (error) {
      console.error('❌ Failed to download image:', error)
      alert(`❌ Failed to download: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleCombineSelected = async () => {
    const selectedImages = getSelectedImages()

    if (selectedImages.length !== 2) {
      alert('Please select exactly 2 images to combine')
      return
    }

    const prompt = window.prompt('How would you like to combine these images?', 'Combine these images into a professional thumbnail')
    if (!prompt) return

    try {
      console.log('🔄 Requesting image combination via chat...')

      // Send a message to the chat agent to combine the images
      const chatMessage = `Combina estas dos imágenes: ${selectedImages[0].url} y ${selectedImages[1].url} con el siguiente prompt: ${prompt}`

      // For now, we'll show this message - in a real implementation,
      // this would integrate with the chat system
      alert(`🔄 Combination request: ${chatMessage}`)

    } catch (error) {
      console.error('❌ Failed to request combination:', error)
      alert(`❌ Failed to request combination: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setGenerating(true)
    clearGenerated()

    try {
      console.log('🎯 Generating images for:', prompt)

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, numImages }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Generation failed')
      }

      const data: ApiResponse = await response.json()
      console.log('📦 Raw API response:', data)

      // Transform API response to store format
      const transformedImages = data.images.map((img, index) => {
        console.log(`🖼️ Image ${index}:`, img)

        // Fix URL if it's an object (extract the actual URL string)
        let imageUrl = img.url
        console.log(`🔍 Original URL for image ${index}:`, imageUrl, typeof imageUrl)

        if (typeof imageUrl === 'object' && imageUrl !== null) {
          console.log(`⚠️ URL is an object:`, imageUrl)
          // If URL is an object, try to extract the actual URL
          imageUrl = imageUrl.url || imageUrl.href || imageUrl.src || Object.values(imageUrl)[0] || imageUrl.toString()
        }

        // Additional safety check
        if (typeof imageUrl === 'string' && imageUrl === '[object Object]') {
          console.error(`❌ URL is still '[object Object]' after fix attempt for image ${index}`)
          imageUrl = `https://via.placeholder.com/640x360?text=Error+Loading+Image`
        }

        console.log(`🔗 Final URL for image ${index}:`, imageUrl, typeof imageUrl)

        return {
          ...img,
          url: imageUrl, // Use the fixed URL
          isSelected: false,
          createdAt: new Date(img.timestamp)
        }
      })
      setGeneratedImages(transformedImages)
      console.log(`✅ Generated ${data.total} images successfully`)
      console.log('🎨 Transformed images:', transformedImages)

    } catch (error) {
      console.error('❌ Generation failed:', error)
      alert(`Failed to generate images: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Panel Toggles Header */}
      <GlassCard variant="dark" className="purple-glow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white">⚙️ Dashboard Controls</h2>
            {selectedImages.length > 0 && (
              <div className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
                <span>🔗 Selected: {selectedImages.length}/2</span>
                <button
                  onClick={clearSelection}
                  className="hover:bg-purple-700 px-1 rounded"
                  title="Clear selection"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <LiquidButton
              onClick={() => setShowGeneratedPanel(!showGeneratedPanel)}
              variant={showGeneratedPanel ? "space" : "dark"}
              size="sm"
              className="flex items-center gap-2 px-5 py-2 min-w-[140px]"
            >
              <span className="text-sm font-medium whitespace-nowrap">Generated</span>
              <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full font-bold">
                {generatedImages.length + generatedHistory.length}
              </span>
            </LiquidButton>
            <LiquidButton
              onClick={() => setShowFavoritesPanel(!showFavoritesPanel)}
              variant={showFavoritesPanel ? "space" : "dark"}
              size="sm"
              className="flex items-center gap-2 px-5 py-2 min-w-[120px]"
            >
              <Heart className="w-4 h-4" />
              <span className="text-sm font-medium whitespace-nowrap">Favorites</span>
              <span className="text-xs bg-red-600 text-white px-2 py-1 rounded-full font-bold">
                {favorites.length}
              </span>
            </LiquidButton>
            <LiquidButton
              onClick={() => setShowUploadsPanel(!showUploadsPanel)}
              variant={showUploadsPanel ? "space" : "dark"}
              size="sm"
              className="flex items-center gap-2 px-5 py-2 min-w-[110px]"
            >
              <Upload className="w-4 h-4" />
              <span className="text-sm font-medium whitespace-nowrap">Uploads</span>
              <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full font-bold">
                {uploads.length}
              </span>
            </LiquidButton>
            <LiquidButton
              onClick={loadAllData}
              variant="dark"
              size="sm"
              className="flex items-center gap-2"
            >
              🔄 Refresh
            </LiquidButton>
          </div>
        </div>
      </GlassCard>
      {/* Current Generated Images (from Chat Agent) */}
      {showGeneratedPanel && (generatedImages.length > 0 || generatedHistory.length > 0) && (
        <GlassCard variant="dark" className="purple-glow">
        </GlassCard>
      )}

      {/* Status Section */}
      {isGenerating && (
        <GlassCard variant="purple" className="purple-glow">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
            <div>
              <p className="text-purple-100 font-medium">🚀 Generating {numImages} images...</p>
              <p className="text-purple-200 text-sm">This may take 30-60 seconds</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Current Generated Images (from Chat Agent) */}
      {showGeneratedPanel && (generatedImages.length > 0 || generatedHistory.length > 0) && (
        <GlassCard variant="dark" className="purple-glow">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">
              ✨ Generated Images ({generatedImages.length})
            </h2>
            <div className="flex gap-3">
              {!selectionMode ? (
                <LiquidButton
                  onClick={() => setSelectionMode(true)}
                  variant="space"
                  size="sm"
                >
                  🔄 Combine Mode
                </LiquidButton>
              ) : (
                <>
                  <LiquidButton
                    onClick={handleCombineSelected}
                    variant="space"
                    size="sm"
                    disabled={getSelectedImages().length !== 2}
                    className="disabled:opacity-50"
                  >
                    ✨ Combine ({getSelectedImages().length}/2)
                  </LiquidButton>
                  <LiquidButton
                    onClick={() => setSelectionMode(false)}
                    variant="space"
                    size="sm"
                  >
                    ❌ Cancel
                  </LiquidButton>
                </>
              )}
            </div>
          </div>
          <div className="image-grid">
            {generatedImages.map((image) => (
              <ImageCard
                key={image.id}
                id={image.id}
                url={image.url}
                source="generated"
                prompt={image.prompt}
                metadata={{
                  timestamp: image.createdAt?.toLocaleString() || 'Unknown',
                  model: 'Flux Dev + DANI LoRA'
                }}
                onToggleFavorite={(id) => {
                  const imageToSave = generatedImages.find(img => img.id === id)
                  if (imageToSave) handleSaveFavorite(imageToSave)
                }}
                onDelete={async (id) => {
                  try {
                    const response = await fetch(`/api/generated?id=${id}`, { method: 'DELETE' })
                    if (response.ok) {
                      setGeneratedImages(prev => prev.filter(img => img.id !== id))
                    }
                  } catch (error) {
                    console.error('Error deleting generated image:', error)
                  }
                }}
              />
            ))}

            {/* Historical images from database */}
            {generatedHistory.map((historyImage) => (
              <ImageCard
                key={`history-${historyImage.id}`}
                id={historyImage.id}
                url={historyImage.replicate_url}
                source="generated"
                prompt={historyImage.prompt}
                metadata={{
                  timestamp: new Date(historyImage.generated_at).toLocaleString(),
                  model: 'Flux Dev + DANI LoRA',
                  type: 'Historical Generation',
                  quality_score: historyImage.quality_score,
                  session: historyImage.generation_session
                }}
                onToggleFavorite={async (id) => {
                  const imageToSave = {
                    id: historyImage.image_id,
                    url: historyImage.replicate_url,
                    prompt: historyImage.prompt,
                    isSelected: false,
                    createdAt: new Date(historyImage.generated_at)
                  }
                  await handleSaveFavorite(imageToSave)
                }}
                onDelete={async (id) => {
                  try {
                    const response = await fetch(`/api/generated?id=${id}`, { method: 'DELETE' })
                    if (response.ok) {
                      setGeneratedHistory(prev => prev.filter(img => img.id !== id))
                    }
                  } catch (error) {
                    console.error('Error deleting generated history image:', error)
                  }
                }}
              />
            ))}
          </div>
        </GlassCard>
      )}

      {/* Favorites Panel */}
      {showFavoritesPanel && (
        <GlassCard variant="dark" className="purple-glow">
          <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-500" />
            Favorite Images ({favorites.length})
          </h2>

          {loading.favorites ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400 mr-3"></div>
              <span className="text-white">Loading favorites...</span>
            </div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">❤️</div>
              <h3 className="text-lg font-medium text-white mb-2">No favorites yet</h3>
              <p className="text-purple-200">
                Save your best generated images as favorites to keep them organized
              </p>
            </div>
          ) : (
            <div className="image-grid">
              {favorites.map((favorite) => (
                <ImageCard
                  key={favorite.id}
                  id={favorite.id}
                  url={favorite.supabase_url || favorite.original_url}
                  source="favorites"
                  prompt={favorite.prompt}
                  metadata={{
                    savedAt: new Date(favorite.saved_at).toLocaleDateString(),
                    originalModel: favorite.model_version || 'Unknown'
                  }}
                  onDelete={async (id) => {
                    if (confirm('¿Remover de favoritos?')) {
                      try {
                        const response = await fetch(`/api/favorites/${id}`, { method: 'DELETE' })
                        if (response.ok) {
                          setFavorites(prev => prev.filter(fav => fav.id !== id))
                        }
                      } catch (error) {
                        console.error('Error deleting favorite:', error)
                      }
                    }
                  }}
                />
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* User Uploads Panel */}
      {showUploadsPanel && (
        <GlassCard variant="dark" className="purple-glow">
          <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
            <Upload className="w-6 h-6 text-blue-500" />
            Your Uploads ({uploads.length})
          </h2>

          {/* Upload Area */}
          <div className="mb-6">
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
                dragOver
                  ? 'border-purple-400 bg-purple-500/10'
                  : 'border-gray-500 hover:border-purple-400 hover:bg-purple-500/5'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <FileImage className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-white text-base mb-2">
                {dragOver ? 'Drop your image here!' : 'Drag & drop an image here'}
              </p>
              <p className="text-gray-400 mb-3">or</p>
              <LiquidButton
                onClick={() => fileInputRef.current?.click()}
                variant="space"
                size="sm"
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
                  if (file) handleUpload(file)
                }}
                className="hidden"
              />
            </div>

            {/* Upload Form */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                className="px-3 py-2 bg-black/30 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 text-sm"
              />
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Tags (comma-separated)"
                className="px-3 py-2 bg-black/30 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 text-sm"
              />
            </div>
          </div>

          {/* Uploads Grid */}
          {loading.uploads ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400 mr-3"></div>
              <span className="text-white">Loading uploads...</span>
            </div>
          ) : uploads.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">📁</div>
              <h3 className="text-lg font-medium text-white mb-2">No uploads yet</h3>
              <p className="text-purple-200 text-sm">
                Upload your first image to start building your media library!
              </p>
            </div>
          ) : (
            <div className="image-grid">
              {uploads.map((upload) => (
                <ImageCard
                  key={upload.id}
                  id={upload.id}
                  url={upload.public_url}
                  source="uploads"
                  prompt={upload.description || upload.filename}
                  metadata={{
                    filename: upload.filename,
                    fileSize: formatFileSize(upload.file_size),
                    uploadedAt: new Date(upload.uploaded_at).toLocaleDateString(),
                    tags: upload.tags.join(', ') || 'No tags'
                  }}
                  onDelete={(id) => handleDeleteUpload(id)}
                />
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* Empty State when all panels are hidden */}
      {!showGeneratedPanel && !showFavoritesPanel && !showUploadsPanel && (
        <GlassCard variant="dark" className="purple-glow">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📱</div>
            <h3 className="text-lg font-medium text-white mb-2">All panels hidden</h3>
            <p className="text-purple-200">
              Use the toggles above to show generated images, favorites, or uploads
            </p>
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
              alt="Imagen ampliada"
              className="w-full h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

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
      `}</style>
    </div>
  )
}