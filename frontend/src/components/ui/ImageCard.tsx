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

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDownload) {
      // Use the robust download function passed as prop
      onDownload({ id, url, prompt: prompt || `Image ${id}` })
    } else {
      // Fallback to simple download
      const link = document.createElement('a')
      link.href = url
      link.download = `image-${id}.png`
      link.click()
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
            {/* Loading Skeleton */}
            {imageLoading && (
              <div className="absolute inset-0 w-full h-32 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 animate-pulse" />
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

        {/* Selection Checkbox - Always visible */}
        <div className="absolute top-2 left-2 z-10">
          <div className={`
            w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-200
            ${isImageSelected(id)
              ? 'bg-purple-600 border-purple-600 text-white scale-110 shadow-lg'
              : 'bg-black/50 border-white/70 text-white backdrop-blur-sm hover:bg-purple-500/70 hover:border-purple-400'
            }
          `}>
            {isImageSelected(id) && '✓'}
          </div>
        </div>

        {/* Hover Controls - Bottom positioned */}
        <div className={`
          absolute bottom-2 left-2 right-2 flex justify-center gap-1 transition-all duration-200
          ${showControls ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
        `}>
          {/* Expand/Modal */}
          <button
            onClick={handleExpandClick}
            className="w-8 h-8 bg-black/70 hover:bg-black/90 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all hover:scale-110"
            title="Ver detalles"
          >
            <Maximize2 className="w-4 h-4 text-white" />
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            className="w-8 h-8 bg-black/70 hover:bg-black/90 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all hover:scale-110"
            title="Descargar"
          >
            <Download className="w-4 h-4 text-white" />
          </button>

          {/* Favorite (only for non-favorite sources) */}
          {source !== 'favorites' && onToggleFavorite && (
            <button
              onClick={handleFavoriteClick}
              className={`w-8 h-8 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all hover:scale-110 ${
                isFavorite
                  ? 'bg-red-500/80 hover:bg-red-600/90'
                  : 'bg-black/70 hover:bg-red-500/70'
              }`}
              title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'text-white fill-white' : 'text-white'}`} />
            </button>
          )}

          {/* Delete */}
          {onDelete && (
            <button
              onClick={handleDeleteClick}
              className="w-8 h-8 bg-red-500/80 hover:bg-red-600/90 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all hover:scale-110"
              title="Borrar imagen"
            >
              <Trash2 className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>

    </>
  )
}