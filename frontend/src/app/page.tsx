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
  model_version?: string
}

interface GeneratedImage {
  id: string
  image_id: string
  replicate_url: string
  supabase_url?: string
  prompt: string
  model_version?: string
  model_parameters?: any
  generation_session: string
  generated_at: string
  tags: string[]
  quality_score?: number
  webp_optimized: boolean
}

interface CombinedImage {
  id: string
  image_id: string
  source_url: string
  supabase_url?: string
  combination_prompt: string
  source_images: any[]
  model_used: string
  combination_session: string
  created_at: string
  tags: string[]
  quality_score?: number
  webp_optimized: boolean
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
  const [selectedImageData, setSelectedImageData] = useState<any>(null)
  const [combineMode, setCombineMode] = useState(true)
  // Tabs system
  const [activeTab, setActiveTab] = useState('generated')

  // Data states
  const [favorites, setFavorites] = useState<FavoriteImage[]>([])
  const [generatedHistory, setGeneratedHistory] = useState<GeneratedImage[]>([])
  const [combinedHistory, setCombinedHistory] = useState<CombinedImage[]>([])
  const [uploads, setUploads] = useState<UserUpload[]>([])
  const [loading, setLoading] = useState({ favorites: false, generated: false, combined: false, uploads: false })

  // Pagination states
  const [paginationState, setPaginationState] = useState({
    generated: { limit: 100, offset: 0, total: 0, hasMore: false },
    combined: { limit: 100, offset: 0, total: 0, hasMore: false }
  })

  // Upload states
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Image selection from context
  const { selectedImages, handleImageSelect, isImageSelected, isImageDisabled, clearSelection, maxSelection } = useSelectedImages()

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
      count: (Array.isArray(generatedImages) ? generatedImages.filter((img: any) => img.source === 'flux_dani' || !img.source) : []).length + (Array.isArray(generatedHistory) ? generatedHistory.length : 0),
      color: 'from-purple-600 to-blue-600'
    },
    {
      id: 'combined',
      label: 'Combined',
      icon: '🔄',
      count: (Array.isArray(generatedImages) ? generatedImages.filter(img => img.source === 'nano_banana') : []).length + (Array.isArray(combinedHistory) ? combinedHistory.length : 0),
      color: 'from-orange-500 to-red-600'
    },
    {
      id: 'favorites',
      label: 'Favorites',
      icon: '❤️',
      count: Array.isArray(favorites) ? favorites.length : 0,
      color: 'from-red-500 to-pink-600'
    },
    {
      id: 'uploads',
      label: 'Uploads',
      icon: '📁',
      count: Array.isArray(uploads) ? uploads.length : 0,
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
        setSelectedImageData(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedImage])

  // Listen for image modal events from ImageCard components
  useEffect(() => {
    const handleImageModal = (e: CustomEvent) => {
      const { imageUrl, imageData } = e.detail
      setSelectedImage(imageUrl)
      setSelectedImageData(imageData)
    }

    window.addEventListener('openImageModal', handleImageModal as EventListener)
    return () => window.removeEventListener('openImageModal', handleImageModal as EventListener)
  }, [])

  // Load all data on component mount
  useEffect(() => {
    loadAllData()
  }, [])

  // 🔄 Listen for image updates from ChatAgent and reload appropriately
  useEffect(() => {
    const handleImagesUpdated = (event: CustomEvent) => {
      const { type, endpoint, count } = event.detail
      console.log(`🔄 Received reload event: ${type} (${count} images from ${endpoint})`)

      if (type === 'combine_images') {
        console.log('🔄 Reloading combined images after auto-save...')
        loadCombinedHistory()
      } else if (type === 'generate_images') {
        console.log('🔄 Reloading generated images after auto-save...')
        loadGeneratedHistory()
      }
    }

    window.addEventListener('imagesUpdated', handleImagesUpdated)
    return () => window.removeEventListener('imagesUpdated', handleImagesUpdated)
  }, [])

  const loadAllData = async () => {
    await Promise.all([
      loadFavorites(),
      loadGeneratedHistory(),
      loadCombinedHistory(),
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

  const loadGeneratedHistory = async (append = false) => {
    try {
      setLoading(prev => ({ ...prev, generated: true }))
      const currentState = paginationState.generated
      const offset = append ? currentState.offset + currentState.limit : 0

      const response = await fetch(`/api/generated?limit=${currentState.limit}&offset=${offset}`)
      const data = await response.json()
      if (response.ok) {
        if (append) {
          setGeneratedHistory(prev => [...prev, ...(data.images || [])])
        } else {
          setGeneratedHistory(data.images || [])
        }

        setPaginationState(prev => ({
          ...prev,
          generated: {
            ...prev.generated,
            offset: offset,
            total: data.total || 0,
            hasMore: data.hasMore || false
          }
        }))
      }
    } catch (error) {
      console.error('Error loading generated history:', error)
    } finally {
      setLoading(prev => ({ ...prev, generated: false }))
    }
  }

  const loadCombinedHistory = async (append = false) => {
    try {
      setLoading(prev => ({ ...prev, combined: true }))
      const currentState = paginationState.combined
      const offset = append ? currentState.offset + currentState.limit : 0

      const response = await fetch(`/api/combined?limit=${currentState.limit}&offset=${offset}`)
      const data = await response.json()
      if (response.ok) {
        if (append) {
          setCombinedHistory(prev => [...prev, ...(data.images || [])])
        } else {
          setCombinedHistory(data.images || [])
        }

        setPaginationState(prev => ({
          ...prev,
          combined: {
            ...prev.combined,
            offset: offset,
            total: data.total || 0,
            hasMore: data.hasMore || false
          }
        }))
      }
    } catch (error) {
      console.error('Error loading combined history:', error)
    } finally {
      setLoading(prev => ({ ...prev, combined: false }))
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

  // Pagination functions
  const changeLimit = async (tab: 'generated' | 'combined', newLimit: number) => {
    setPaginationState(prev => ({
      ...prev,
      [tab]: { ...prev[tab], limit: newLimit, offset: 0 }
    }))

    // Reload data with new limit
    if (tab === 'generated') {
      await loadGeneratedHistory(false)
    } else if (tab === 'combined') {
      await loadCombinedHistory(false)
    }
  }

  const loadMore = async (tab: 'generated' | 'combined') => {
    if (tab === 'generated' && paginationState.generated.hasMore) {
      await loadGeneratedHistory(true)
    } else if (tab === 'combined' && paginationState.combined.hasMore) {
      await loadCombinedHistory(true)
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

  const handleDeleteSelected = async () => {
    if (!Array.isArray(selectedImages) || selectedImages.length === 0) return

    if (confirm(`¿Eliminar ${selectedImages.length} imágenes seleccionadas?`)) {
      try {
        // Store selected IDs before clearing selection
        const selectedIds = selectedImages.map(img => img.id)

        // Clear selection first to prevent race conditions
        clearSelection()

        // Delete from generated images in current session (with safety check)
        if (Array.isArray(generatedImages)) {
          const filteredImages = generatedImages.filter(img => !selectedIds.includes(img.id))
          setGeneratedImages(filteredImages)
        }

        // Delete from database for historical images
        const deletePromises = selectedIds.map(id =>
          fetch(`/api/generated?id=${id}`, { method: 'DELETE' }).catch(err =>
            console.warn(`Failed to delete ${id}:`, err)
          )
        )
        await Promise.all(deletePromises)

        // Delete from favorites if any
        const favoriteDeletePromises = selectedIds.map(id =>
          fetch(`/api/favorites/${id}`, { method: 'DELETE' }).catch(err =>
            console.warn(`Failed to delete favorite ${id}:`, err)
          )
        )
        await Promise.all(favoriteDeletePromises)

        // Reload data to ensure consistency
        await loadAllData()

        // Success notification
        const notification = document.createElement('div')
        notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50'
        notification.textContent = `✅ ${selectedIds.length} imágenes eliminadas`
        document.body.appendChild(notification)
        setTimeout(() => notification.remove(), 3000)
      } catch (error) {
        console.error('Error deleting images:', error)
        alert('Error al eliminar imágenes')
      }
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

              {/* Simple Toggle Button */}
              <button
                onClick={() => {
                  setCombineMode(!combineMode)
                  // Clear selection when switching modes for better UX
                  if (selectedImages.length > 0) {
                    clearSelection()
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border-2 flex items-center gap-2 shadow-lg ${
                  combineMode
                    ? 'bg-purple-600 border-purple-500 text-white hover:bg-purple-700 hover:shadow-purple-500/30'
                    : 'bg-gray-800 border-gray-600 text-gray-400 opacity-50'
                }`}
              >
                🔄 Combine
              </button>
            </div>
            <div className="flex items-center gap-3">
              {selectedImages.length > 0 && (
                <>
                  <div className={`px-3 py-1 rounded-full text-sm flex items-center gap-2 transition-all ${
                    combineMode
                      ? (selectedImages.length >= 2 && selectedImages.length <= 8
                          ? 'bg-green-600 text-white'
                          : 'bg-purple-600 text-white')
                      : 'bg-red-600 text-white'
                  }`}>
                    <span>
                      {combineMode
                        ? `${selectedImages.length}/8`
                        : `${selectedImages.length} selected`
                      }
                    </span>
                    <button
                      onClick={clearSelection}
                      className="hover:bg-black/20 px-1 rounded"
                      title="Clear selection"
                    >
                      ✕
                    </button>
                  </div>
                  {/* Delete Button - Only show when images are selected and not in combine mode */}
                  {!combineMode && (
                    <button
                      onClick={handleDeleteSelected}
                      className="w-10 h-10 bg-red-600 hover:bg-red-700 rounded-lg flex items-center justify-center transition-all hover:scale-110 shadow-lg"
                      title={`Eliminar ${selectedImages.length} imágenes seleccionadas`}
                    >
                      <Trash2 className="w-5 h-5 text-white" />
                    </button>
                  )}
                </>
              )}
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
      {activeTab === 'generated' && ((Array.isArray(generatedImages) ? generatedImages.filter(img => img.source === 'flux_dani' || !img.source) : []).length > 0 || (Array.isArray(generatedHistory) ? generatedHistory.length : 0) > 0) && (
        <GlassCard variant="dark" className="purple-glow">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">
              ✨ Generated Images ({(Array.isArray(generatedImages) ? generatedImages.filter(img => img.source === 'flux_dani' || !img.source) : []).length + (Array.isArray(generatedHistory) ? generatedHistory.length : 0)})
            </h2>

            {/* Pagination Controls for Generated */}
            <div className="flex items-center gap-3">
              <div className="text-sm text-purple-200">
                {paginationState.generated.total > 0 && (
                  <span>Showing {Math.min(paginationState.generated.offset + paginationState.generated.limit, paginationState.generated.total)} of {paginationState.generated.total}</span>
                )}
              </div>

              <select
                value={paginationState.generated.limit}
                onChange={(e) => changeLimit('generated', parseInt(e.target.value))}
                className="px-3 py-1 bg-black/30 border border-purple-500/30 rounded text-white text-sm focus:outline-none focus:border-purple-400"
              >
                <option value={50}>50 images</option>
                <option value={100}>100 images</option>
                <option value={200}>200 images</option>
                <option value={500}>500 images</option>
              </select>

              {paginationState.generated.hasMore && (
                <button
                  onClick={() => loadMore('generated')}
                  disabled={loading.generated}
                  className="px-4 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm rounded transition-colors flex items-center gap-2"
                >
                  {loading.generated ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </button>
              )}
            </div>
          </div>
          <div className="image-grid">
            {(Array.isArray(generatedImages) ? generatedImages.filter(img => img.source === 'flux_dani' || !img.source) : []).map((image) => (
              <div key={image.id} className="relative group">
                <img
                  src={image.url}
                  alt={image.prompt}
                  className="w-full h-32 object-cover rounded-lg transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Selection Checkbox - Always visible */}
                <div className="absolute top-2 left-2 z-10">
                  <div className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-200
                    ${isImageSelected(image.id)
                      ? 'bg-purple-600 border-purple-600 text-white scale-110 shadow-lg'
                      : 'bg-black/50 border-white/70 text-white backdrop-blur-sm hover:bg-purple-500/70 hover:border-purple-400'
                    }
                  `}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isImageDisabled(image.id)) {
                        handleImageSelect(image.id, image.url, 'generated')
                      }
                    }}
                  >
                    {isImageSelected(image.id) && '✓'}
                  </div>
                </div>

                {/* Hover Controls - Bottom positioned */}
                <div className="absolute bottom-2 left-2 right-2 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {/* Expand/Modal */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedImage(image.url)
                      setSelectedImageData({
                        id: image.id,
                        prompt: image.prompt,
                        source: 'generated',
                        metadata: {
                          timestamp: image.createdAt?.toLocaleString() || 'Unknown',
                          model: 'Flux Dev + DANI LoRA'
                        }
                      })
                    }}
                    className="w-8 h-8 bg-black/70 hover:bg-black/90 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all hover:scale-110"
                    title="Ver detalles"
                  >
                    <Maximize2 className="w-4 h-4 text-white" />
                  </button>

                  {/* Download */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDownloadImage(image)
                    }}
                    className="w-8 h-8 bg-black/70 hover:bg-black/90 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all hover:scale-110"
                    title="Descargar"
                  >
                    <Download className="w-4 h-4 text-white" />
                  </button>

                  {/* Favorite */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSaveFavorite(image)
                    }}
                    className="w-8 h-8 bg-black/70 hover:bg-red-500/70 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all hover:scale-110"
                    title="Agregar a favoritos"
                  >
                    <Heart className="w-4 h-4 text-white" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation()
                      if (!combineMode && selectedImages.length > 0) {
                        // In delete mode with selections, delete all selected
                        handleDeleteSelected()
                      } else {
                        // In combine mode or no selections, delete just this one
                        try {
                          const response = await fetch(`/api/generated?id=${image.id}`, { method: 'DELETE' })
                          if (response.ok) {
                            const filteredImages = generatedImages.filter(img => img.id !== image.id)
                            setGeneratedImages(filteredImages)
                          }
                        } catch (error) {
                          console.error('Error deleting generated image:', error)
                        }
                      }
                    }}
                    className="w-8 h-8 bg-red-500/80 hover:bg-red-600/90 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all hover:scale-110"
                    title="Borrar imagen"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            ))}

            {/* Historical images from database */}
            {generatedHistory.map((historyImage) => (
              <ImageCard
                key={`history-${historyImage.id}`}
                id={historyImage.id}
                url={historyImage.supabase_url || historyImage.replicate_url}
                source="generated"
                prompt={historyImage.prompt}
                metadata={{
                  timestamp: new Date(historyImage.generated_at).toLocaleString(),
                  model: 'Flux Dev + DANI LoRA',
                  type: 'Historical Generation',
                  quality_score: historyImage.quality_score,
                  session: historyImage.generation_session,
                  webp_optimized: historyImage.webp_optimized
                }}
                onToggleFavorite={async (id) => {
                  const imageToSave = {
                    id: historyImage.image_id,
                    url: historyImage.supabase_url || historyImage.replicate_url,
                    prompt: historyImage.prompt,
                    isSelected: false,
                    createdAt: new Date(historyImage.generated_at)
                  }
                  await handleSaveFavorite(imageToSave)
                }}
                onDelete={async (id) => {
                  if (!combineMode && selectedImages.length > 0) {
                    // In delete mode with selections, delete all selected
                    handleDeleteSelected()
                  } else {
                    // In combine mode or no selections, delete just this one
                    try {
                      const response = await fetch(`/api/generated?id=${id}`, { method: 'DELETE' })
                      if (response.ok) {
                        setGeneratedHistory(prev => prev.filter(img => img.id !== id))
                      }
                    } catch (error) {
                      console.error('Error deleting generated history image:', error)
                    }
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
              🔄 Combined Images ({(Array.isArray(generatedImages) ? generatedImages.filter(img => img.source === 'nano_banana') : []).length + (Array.isArray(combinedHistory) ? combinedHistory.length : 0)})
            </h2>

            {/* Pagination Controls for Combined */}
            <div className="flex items-center gap-3">
              <div className="text-sm text-orange-200">
                {paginationState.combined.total > 0 && (
                  <span>Showing {Math.min(paginationState.combined.offset + paginationState.combined.limit, paginationState.combined.total)} of {paginationState.combined.total}</span>
                )}
              </div>

              <select
                value={paginationState.combined.limit}
                onChange={(e) => changeLimit('combined', parseInt(e.target.value))}
                className="px-3 py-1 bg-black/30 border border-orange-500/30 rounded text-white text-sm focus:outline-none focus:border-orange-400"
              >
                <option value={50}>50 images</option>
                <option value={100}>100 images</option>
                <option value={200}>200 images</option>
                <option value={500}>500 images</option>
              </select>

              {paginationState.combined.hasMore && (
                <button
                  onClick={() => loadMore('combined')}
                  disabled={loading.combined}
                  className="px-4 py-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm rounded transition-colors flex items-center gap-2"
                >
                  {loading.combined ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </button>
              )}
            </div>
          </div>

          {loading.combined ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400 mr-3"></div>
              <span className="text-white">Loading combined images...</span>
            </div>
          ) : (Array.isArray(generatedImages) ? generatedImages.filter(img => img.source === 'nano_banana') : []).length === 0 && (Array.isArray(combinedHistory) ? combinedHistory.length : 0) === 0 ? (
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
              {(Array.isArray(generatedImages) ? generatedImages.filter(img => img.source === 'nano_banana') : []).map((image) => (
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
                    const imageToSave = Array.isArray(generatedImages) ? generatedImages.find(img => img.id === id) : null
                    if (imageToSave) handleSaveFavorite(imageToSave)
                  }}
                  onDelete={async (id) => {
                    if (!combineMode && selectedImages.length > 0) {
                      // In delete mode with selections, delete all selected
                      handleDeleteSelected()
                    } else {
                      // In combine mode or no selections, delete just this one
                      try {
                        const response = await fetch(`/api/combined?id=${id}`, { method: 'DELETE' })
                        if (response.ok) {
                          const filteredImages = generatedImages.filter(img => img.id !== id)
                          setGeneratedImages(filteredImages)
                        }
                      } catch (error) {
                        console.error('Error deleting combined image:', error)
                      }
                    }
                  }}
                />
              ))}

              {/* Historical combined images from dedicated table */}
              {combinedHistory.map((historyImage) => (
                <ImageCard
                  key={`combined-history-${historyImage.id}`}
                  id={historyImage.id}
                  url={historyImage.supabase_url || historyImage.source_url}
                  source="combined"
                  prompt={historyImage.combination_prompt}
                  metadata={{
                    timestamp: new Date(historyImage.created_at).toLocaleString(),
                    model: historyImage.model_used || 'Nano Banana',
                    type: 'Historical Combined',
                    session: historyImage.combination_session,
                    webp_optimized: historyImage.webp_optimized,
                    source_images_count: historyImage.source_images?.length || 0
                  }}
                  onToggleFavorite={async (id) => {
                    const imageToSave = {
                      id: historyImage.image_id,
                      url: historyImage.supabase_url || historyImage.source_url,
                      prompt: historyImage.combination_prompt,
                      isSelected: false,
                      createdAt: new Date(historyImage.created_at)
                    }
                    await handleSaveFavorite(imageToSave)
                  }}
                  onDelete={async (id) => {
                    if (!combineMode && selectedImages.length > 0) {
                      // In delete mode with selections, delete all selected
                      handleDeleteSelected()
                    } else {
                      // In combine mode or no selections, delete just this one
                      try {
                        const response = await fetch(`/api/combined?id=${id}`, { method: 'DELETE' })
                        if (response.ok) {
                          setCombinedHistory(prev => prev.filter(img => img.id !== id))
                        }
                      } catch (error) {
                        console.error('Error deleting combined history image:', error)
                      }
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
                    if (!combineMode && selectedImages.length > 0) {
                      // In delete mode with selections, delete all selected
                      handleDeleteSelected()
                    } else {
                      // In combine mode or no selections, delete just this one
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
                  onDelete={(id) => {
                    if (!combineMode && selectedImages.length > 0) {
                      // In delete mode with selections, delete all selected
                      handleDeleteSelected()
                    } else {
                      // In combine mode or no selections, delete just this one
                      handleDeleteUpload(id)
                    }
                  }}
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


      {/* Simple Image Modal with Scroll */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black z-50 overflow-y-auto"
          onClick={() => {
            setSelectedImage(null)
            setSelectedImageData(null)
          }}
        >
          {/* Close button - fixed position */}
          <button
            onClick={() => {
              setSelectedImage(null)
              setSelectedImageData(null)
            }}
            className="fixed top-6 right-6 bg-red-600/80 hover:bg-red-700/90 text-white w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold transition-colors z-10 border-2 border-white/20 shadow-xl"
          >
            ✕
          </button>

          {/* Scrollable content */}
          <div className="min-h-screen flex flex-col">
            {/* Image - takes full viewport height */}
            <div className="h-screen flex items-center justify-center p-4">
              <img
                src={selectedImage}
                alt={selectedImageData?.prompt || "Imagen ampliada"}
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Text content below - only shows when scrolling down */}
            {selectedImageData && (
              <div className="bg-black/95 p-8 border-t border-purple-500/30">
                <div className="max-w-4xl mx-auto">
                  <div className="text-purple-300 font-medium text-lg mb-4 flex items-center gap-3">
                    {selectedImageData.source === 'combined' ? '🔄 Combined Image' :
                     selectedImageData.source === 'favorites' ? '❤️ Favorite Image' :
                     '✨ Generated Image'}
                    {selectedImageData.metadata?.model && (
                      <span className="text-sm bg-purple-600/20 px-3 py-1 rounded-full">
                        {selectedImageData.metadata.model}
                      </span>
                    )}
                  </div>

                  {selectedImageData.prompt && (
                    <div className="mb-6">
                      <h3 className="text-purple-300 font-medium mb-2">Prompt:</h3>
                      <p className="text-gray-300 leading-relaxed">
                        {selectedImageData.prompt}
                      </p>
                    </div>
                  )}

                  {selectedImageData.metadata && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {selectedImageData.metadata.timestamp && (
                        <div>
                          <span className="text-purple-300 font-medium">Fecha:</span>
                          <div className="text-gray-300 mt-1">{selectedImageData.metadata.timestamp}</div>
                        </div>
                      )}
                      {selectedImageData.id && (
                        <div>
                          <span className="text-purple-300 font-medium">ID:</span>
                          <div className="text-gray-300 font-mono mt-1">{selectedImageData.id}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
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