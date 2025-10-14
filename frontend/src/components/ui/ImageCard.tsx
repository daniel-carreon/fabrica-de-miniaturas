'use client'

import { useState } from 'react'
import { useSelectedImages } from '@/shared/contexts/SelectedImagesContext'
import { Heart, Maximize2, Download, Trash2 } from 'lucide-react'

interface ImageCardProps {
  id: string
  url: string
  source: 'generated' | 'favorites' | 'uploads' | 'combined'
  prompt?: string
  metadata?: any
  onDelete?: (id: string) => void
  onToggleFavorite?: (id: string) => void
  onDownload?: (image: { id: string; url: string; prompt: string }) => void
  isFavorite?: boolean
  disabled?: boolean
}

export default function ImageCard({
  id,
  url,
  source,
  prompt,
  metadata,
  onDelete,
  onToggleFavorite,
  onDownload,
  isFavorite = false,
  disabled = false
}: ImageCardProps) {
  const { handleImageSelect, isImageSelected, isImageDisabled } = useSelectedImages()
  const [showModal, setShowModal] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isImageDisabled(id)) {
      handleImageSelect(id, url, source)
    }
  }

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Use the global modal system from page.tsx instead of local modal
    window.dispatchEvent(new CustomEvent('openImageModal', {
      detail: { imageUrl: url, imageData: { id, prompt, source, metadata } }
    }))
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete && confirm('¿Borrar esta imagen?')) {
      onDelete(id)
    }
  }

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onToggleFavorite) {
      onToggleFavorite(id)
    }
  }

  const handleImageLoad = () => {
    setImageLoading(false)
    setImageError(false)
  }

  const handleImageError = () => {
    setImageLoading(false)
    setImageError(true)
  }

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()

    // Always use the new /api/download endpoint for proper JPG conversion
    try {
      console.log(`🔽 Starting download for image ${id} from source: ${source}`)

      // Create download URL with proper parameters
      const downloadUrl = `/api/download?id=${encodeURIComponent(id)}&source=${encodeURIComponent(source)}`

      // Create a temporary link and trigger download
      const link = document.createElement('a')
      link.href = downloadUrl
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      console.log(`✅ Download initiated for image ${id}`)
    } catch (error) {
      console.error('❌ Error downloading image:', error)

      // Fallback to original method if new endpoint fails
      if (onDownload) {
        onDownload({ id, url, prompt: prompt || `Image ${id}` })
      } else {
        const link = document.createElement('a')
        link.href = url
        link.download = `image-${id}.jpg`
        link.click()
      }
    }
  }

  return (
    <>
      {/* Main Card */}
      <div
        className={`
          image-card group relative transition-all duration-300 rounded-lg overflow-hidden
          ${isImageDisabled(id)
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer'
          }
          ${isImageSelected(id)
            ? 'ring-4 ring-purple-500 ring-opacity-80 shadow-lg shadow-purple-500/30'
            : isImageDisabled(id)
            ? ''
            : 'hover:ring-2 hover:ring-purple-300 hover:shadow-lg'
          }
        `}
        onClick={handleCardClick}
        onMouseEnter={() => !isImageDisabled(id) && setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* Image with Error Handling */}
        {imageError ? (
          /* Error Placeholder */
          <div className="w-full h-32 bg-gray-800 flex flex-col items-center justify-center text-gray-400">
            <div className="text-2xl mb-2">🖼️</div>
            <div className="text-xs text-center px-2">
              <p className="font-medium">Imagen no disponible</p>
              <p className="text-gray-500">URL expirado</p>
            </div>
          </div>
        ) : (
          <>
            {/* Loading Skeleton - Purple shimmer */}
            {imageLoading && (
              <div className="absolute inset-0 w-full h-32 bg-gradient-to-r from-black/90 via-purple-900/40 to-black/90 animate-pulse overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/20 to-transparent animate-shimmer" style={{
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2s infinite'
                }} />
              </div>
            )}
            {/* Actual Image */}
            <img
              src={url}
              alt={prompt || `Image from ${source}`}
              className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </>
        )}

        {/* Selection Checkbox - Always visible, touch-optimized */}
        <div className="absolute top-2 left-2 z-10">
          <div className={`
            w-8 h-8 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center text-sm md:text-xs font-bold transition-all duration-200 touch-manipulation active:scale-95
            ${isImageSelected(id)
              ? 'bg-purple-600 border-purple-600 text-white scale-110 shadow-lg shadow-purple-500/50'
              : 'bg-black/60 border-white/80 text-white backdrop-blur-sm hover:bg-purple-500/70 hover:border-purple-400 active:bg-purple-600'
            }
          `}>
            {isImageSelected(id) && '✓'}
          </div>
        </div>

        {/* Touch-Optimized Controls - Always visible on mobile, hover on desktop */}
        <div className={`
          absolute bottom-2 left-2 right-2 flex justify-center gap-1.5 transition-all duration-200
          opacity-100 md:opacity-0 md:group-hover:opacity-100
        `}>
          {/* Expand/Modal - Touch optimized */}
          <button
            onClick={handleExpandClick}
            className="w-10 h-10 md:w-8 md:h-8 bg-black/80 hover:bg-black/95 active:bg-purple-600/90 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 touch-manipulation"
            title="Ver detalles"
          >
            <Maximize2 className="w-5 h-5 md:w-4 md:h-4 text-white" />
          </button>

          {/* Download - Touch optimized */}
          <button
            onClick={handleDownload}
            className="w-10 h-10 md:w-8 md:h-8 bg-black/80 hover:bg-black/95 active:bg-purple-600/90 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 touch-manipulation"
            title="Descargar"
          >
            <Download className="w-5 h-5 md:w-4 md:h-4 text-white" />
          </button>

          {/* Favorite (only for non-favorite sources) - Touch optimized */}
          {source !== 'favorites' && onToggleFavorite && (
            <button
              onClick={handleFavoriteClick}
              className={`w-10 h-10 md:w-8 md:h-8 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 touch-manipulation ${
                isFavorite
                  ? 'bg-red-500/90 hover:bg-red-600/95 active:bg-red-700'
                  : 'bg-black/80 hover:bg-red-500/80 active:bg-red-600/90'
              }`}
              title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
            >
              <Heart className={`w-5 h-5 md:w-4 md:h-4 ${isFavorite ? 'text-white fill-white' : 'text-white'}`} />
            </button>
          )}

          {/* Delete - Touch optimized */}
          {onDelete && (
            <button
              onClick={handleDeleteClick}
              className="w-10 h-10 md:w-8 md:h-8 bg-red-500/90 hover:bg-red-600/95 active:bg-red-700 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 touch-manipulation"
              title="Borrar imagen"
            >
              <Trash2 className="w-5 h-5 md:w-4 md:h-4 text-white" />
            </button>
          )}
        </div>
      </div>

    </>
  )
}