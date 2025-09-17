'use client'

import { useState } from 'react'
import { useSelectedImages } from '@/shared/contexts/SelectedImagesContext'
import { Heart, Maximize2, Download, Trash2 } from 'lucide-react'

interface ImageCardProps {
  id: string
  url: string
  source: 'generated' | 'favorites' | 'uploads'
  prompt?: string
  metadata?: any
  onDelete?: (id: string) => void
  onToggleFavorite?: (id: string) => void
  isFavorite?: boolean
}

export default function ImageCard({
  id,
  url,
  source,
  prompt,
  metadata,
  onDelete,
  onToggleFavorite,
  isFavorite = false
}: ImageCardProps) {
  const { handleImageSelect, isImageSelected } = useSelectedImages()
  const [showModal, setShowModal] = useState(false)
  const [showControls, setShowControls] = useState(false)

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault()
    handleImageSelect(id, url, source)
  }

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowModal(true)
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

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    const link = document.createElement('a')
    link.href = url
    link.download = `image-${id}.png`
    link.click()
  }

  return (
    <>
      {/* Main Card */}
      <div
        className={`
          image-card group relative cursor-pointer transition-all duration-300 rounded-lg overflow-hidden
          ${isImageSelected(id)
            ? 'ring-4 ring-purple-500 ring-opacity-80 shadow-lg shadow-purple-500/30'
            : 'hover:ring-2 hover:ring-purple-300 hover:shadow-lg'
          }
        `}
        onClick={handleCardClick}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* Image */}
        <img
          src={url}
          alt={prompt || `Image from ${source}`}
          className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

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

      {/* Modal for expanded view */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="max-w-4xl max-h-full bg-black/90 rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <img src={url} alt={prompt || `Image from ${source}`} className="max-w-full max-h-[80vh] object-contain" />
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white w-10 h-10 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            {/* Metadata */}
            <div className="p-6 border-t border-gray-700">
              <h3 className="text-white font-bold mb-2">Detalles de la imagen</h3>
              {prompt && (
                <div className="mb-3">
                  <span className="text-purple-300 text-sm font-medium">Prompt:</span>
                  <p className="text-gray-300 text-sm mt-1">{prompt}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-purple-300 font-medium">Fuente:</span>
                  <span className="text-gray-300 ml-2">{source}</span>
                </div>
                <div>
                  <span className="text-purple-300 font-medium">ID:</span>
                  <span className="text-gray-300 ml-2 font-mono">{id}</span>
                </div>
                {metadata && Object.entries(metadata).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-purple-300 font-medium">{key}:</span>
                    <span className="text-gray-300 ml-2">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}