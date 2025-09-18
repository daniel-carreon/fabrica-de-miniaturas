'use client'

import { useState, useEffect, useRef } from 'react'
import { useImageStore } from '@/shared/stores/imageStore'
import GlassCard from '@/components/ui/glass-card'
import { LiquidButton } from '@/components/ui/liquid-glass-button'
import { Download, Maximize2, Heart, Upload, FileImage, Trash2, Tag, Clock } from 'lucide-react'
import ImageCard from '@/components/ui/ImageCard'
import { useSelectedImages } from '@/shared/contexts/SelectedImagesContext'
import PromptsPanel from '@/components/ui/PromptsPanel'
import TabsNavigator from '@/components/ui/TabsNavigator'

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
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectionMode, setSelectionMode] = useState<'combine' | 'delete'>('combine')
  // Tabs system
  const [activeTab, setActiveTab] = useState('generated')

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

  // Tabs configuration
  const tabs = [
    {
      id: 'generated',
      label: 'Generated',
      icon: '⚡',
      count: generatedImages.filter(img => img.source === 'flux_dani' || !img.source).length + generatedHistory.filter(img => !img.is_combined).length,
      color: 'from-purple-600 to-blue-600'
    },
    {
      id: 'combined',
      label: 'Combined',
      icon: '🔄',
      count: generatedImages.filter(img => img.source === 'nano_banana').length + generatedHistory.filter(img => img.is_combined).length,
      color: 'from-orange-500 to-red-600'
    },
    {
      id: 'favorites',
      label: 'Favorites',
      icon: '❤️',
      count: favorites.length,
      color: 'from-red-500 to-pink-600'
    },
    {
      id: 'uploads',
      label: 'Uploads',
      icon: '📁',
      count: uploads.length,
      color: 'from-blue-500 to-cyan-600'
    },
    {
      id: 'prompts',
      label: 'Prompts',
      icon: '📝',
      count: 8, // We know we seeded 8 prompts
      color: 'from-green-500 to-emerald-600'
    }
  ]

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

    if (selectedImages.length < 2 || selectedImages.length > 8) {
      alert('Please select between 2-8 images to combine')
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


  return (
    <div className="space-y-8">
      {/* Modern Tabs Navigation */}
      <GlassCard variant="dark" className="purple-glow">
        <div className="space-y-4">
          {/* Header with selection info */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-white">🚀 Media Dashboard</h2>

              {/* Selection Mode Toggle */}
              <div className="flex bg-black/20 rounded-lg p-1 border border-purple-500/30">
                <button
                  onClick={() => setSelectionMode('combine')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                    selectionMode === 'combine'
                      ? 'bg-purple-600 text-white'
                      : 'text-purple-300 hover:text-white'
                  }`}
                >
                  🔄 Combine
                </button>
                <button
                  onClick={() => setSelectionMode('delete')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                    selectionMode === 'delete'
                      ? 'bg-red-600 text-white'
                      : 'text-purple-300 hover:text-white'
                  }`}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {selectedImages.length > 0 && (
                <div className={`px-3 py-1 rounded-full text-sm flex items-center gap-2 transition-all ${
                  selectionMode === 'combine'
                    ? (selectedImages.length >= 2 && selectedImages.length <= 8
                        ? 'bg-green-600 text-white'
                        : 'bg-purple-600 text-white')
                    : 'bg-red-600 text-white'
                }`}>
                  <span>
                    {selectionMode === 'combine'
                      ? `🔄 Selected: ${selectedImages.length}/8`
                      : `🗑️ Selected: ${selectedImages.length}`
                    }
                  </span>
                  {selectionMode === 'combine' && selectedImages.length >= 2 && selectedImages.length <= 8 && (
                    <span className="text-xs opacity-80">✅ Ready to combine</span>
                  )}
                  {selectionMode === 'delete' && selectedImages.length > 0 && (
                    <span className="text-xs opacity-80">✅ Ready to delete</span>
                  )}
                  <button
                    onClick={clearSelection}
                    className="hover:bg-black/20 px-1 rounded ml-2"
                    title="Clear selection"
                  >
                    ✕
                  </button>
                  {selectionMode === 'delete' && selectedImages.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm(`¿Eliminar ${selectedImages.length} imágenes seleccionadas?`)) {
                          // TODO: Implementar eliminación múltiple
                          console.log('Eliminar imágenes:', selectedImages)
                          clearSelection()
                        }
                      }}
                      className="hover:bg-black/20 px-2 py-1 rounded text-xs bg-red-600/80"
                      title="Delete selected images"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              )}
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

          {/* Tabs Navigator */}
          <TabsNavigator
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            className="w-full"
          />
        </div>
      </GlassCard>
      {/* Status Section */}
      {isGenerating && (
        <GlassCard variant="purple" className="purple-glow">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
            <div>
              <p className="text-purple-100 font-medium">🚀 AI Agent generating images...</p>
              <p className="text-purple-200 text-sm">This may take 30-60 seconds</p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Generated Images Tab */}
      {activeTab === 'generated' && (generatedImages.filter(img => img.source === 'flux_dani' || !img.source).length > 0 || generatedHistory.filter(img => !img.is_combined).length > 0) && (
        <GlassCard variant="dark" className="purple-glow">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">
              ✨ Generated Images ({generatedImages.filter(img => img.source === 'flux_dani' || !img.source).length + generatedHistory.filter(img => !img.is_combined).length})
            </h2>
          </div>
          <div className="image-grid">
            {generatedImages.filter(img => img.source === 'flux_dani' || !img.source).map((image) => (
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
            {generatedHistory.filter(img => !img.is_combined).map((historyImage) => (
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

      {/* Combined Images Tab */}
      {activeTab === 'combined' && (
        <GlassCard variant="dark" className="purple-glow">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">
              🔄 Combined Images ({generatedImages.filter(img => img.source === 'nano_banana').length + generatedHistory.filter(img => img.is_combined).length})
            </h2>
          </div>

          {generatedImages.filter(img => img.source === 'nano_banana').length === 0 && generatedHistory.filter(img => img.is_combined).length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔄</div>
              <h3 className="text-lg font-medium text-white mb-2">No combined images yet</h3>
              <p className="text-purple-200">
                Select 2-8 images and ask the AI agent to combine them using Nano Banana!
              </p>
            </div>
          ) : (
            <div className="image-grid">
              {/* Current session combined images */}
              {generatedImages.filter(img => img.source === 'nano_banana').map((image) => (
                <ImageCard
                  key={image.id}
                  id={image.id}
                  url={image.url}
                  source="combined"
                  prompt={image.prompt}
                  metadata={{
                    timestamp: image.createdAt?.toLocaleString() || 'Unknown',
                    model: 'Nano Banana (Gemini 2.5 Flash)',
                    type: 'AI Combined'
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
                      console.error('Error deleting combined image:', error)
                    }
                  }}
                />
              ))}

              {/* Historical combined images */}
              {generatedHistory.filter(img => img.is_combined).map((historyImage) => (
                <ImageCard
                  key={`combined-history-${historyImage.id}`}
                  id={historyImage.id}
                  url={historyImage.replicate_url}
                  source="combined"
                  prompt={historyImage.prompt}
                  metadata={{
                    timestamp: new Date(historyImage.generated_at).toLocaleString(),
                    model: 'Nano Banana (Gemini 2.5 Flash)',
                    type: 'Historical Combined',
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
                      console.error('Error deleting combined history image:', error)
                    }
                  }}
                />
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* Favorites Tab */}
      {activeTab === 'favorites' && (
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

      {/* Uploads Tab */}
      {activeTab === 'uploads' && (
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

      {/* Prompts Tab */}
      {activeTab === 'prompts' && (
        <GlassCard variant="dark" className="purple-glow">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">
              📝 Saved Prompts
            </h2>
          </div>
          <PromptsPanel onInjectPrompt={(prompt) => {
            // For dashboard, we could show a notification or add to clipboard
            navigator.clipboard.writeText(prompt)

            // Show success notification
            const notification = document.createElement('div')
            notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50'
            notification.textContent = '✅ Prompt copied to clipboard!'
            document.body.appendChild(notification)
            setTimeout(() => notification.remove(), 2000)
          }} />
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