'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import GlassCard from '@/components/ui/glass-card'
import { LiquidButton } from '@/components/ui/liquid-glass-button'
import { Download, Maximize2, ArrowLeft, Trash2 } from 'lucide-react'

interface FavoriteImage {
  id: string
  image_id: string
  original_url: string
  supabase_url?: string
  prompt: string
  saved_at: string
}

export default function FavoritesPage() {
  const router = useRouter()
  const [favorites, setFavorites] = useState<FavoriteImage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  useEffect(() => {
    loadFavorites()
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

  const loadFavorites = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/favorites')
      const data = await response.json()

      if (response.ok) {
        setFavorites(data.favorites || [])
      } else {
        console.error('Failed to load favorites:', data.error)
      }
    } catch (error) {
      console.error('Error loading favorites:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadImage = async (image: FavoriteImage) => {
    try {
      const imageUrl = image.supabase_url || image.original_url
      const response = await fetch(imageUrl)
      const blob = await response.blob()

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      const cleanPrompt = image.prompt.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)
      link.download = `favorite_${cleanPrompt}_${image.image_id}.webp`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download image:', error)
      alert('❌ Failed to download image')
    }
  }

  const handleDeleteFavorite = async (favoriteId: string) => {
    if (!confirm('Are you sure you want to remove this favorite?')) return

    try {
      const response = await fetch(`/api/favorites/${favoriteId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setFavorites(prev => prev.filter(fav => fav.id !== favoriteId))
        alert('✅ Favorite removed successfully')
      } else {
        throw new Error('Failed to delete favorite')
      }
    } catch (error) {
      console.error('Error deleting favorite:', error)
      alert('❌ Failed to remove favorite')
    }
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
                ❤️ Saved Favorites
              </h1>
            </div>
            <LiquidButton
              onClick={loadFavorites}
              variant="space"
              size="sm"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </LiquidButton>
          </div>
          <p className="text-gray-300 mt-2">
            Your collection of saved images from the generator
          </p>
        </div>

        {/* Favorites Grid */}
        {loading ? (
          <GlassCard variant="dark" className="purple-glow">
            <div className="flex items-center justify-center py-12">
              <div className="text-white">Loading favorites...</div>
            </div>
          </GlassCard>
        ) : favorites.length === 0 ? (
          <GlassCard variant="dark" className="purple-glow">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💔</div>
              <h2 className="text-2xl font-bold text-white mb-2">No Favorites Yet</h2>
              <p className="text-gray-300 mb-6">
                Start generating images and save your favorites to see them here!
              </p>
              <LiquidButton
                onClick={() => router.push('/')}
                variant="space"
              >
                Generate Images
              </LiquidButton>
            </div>
          </GlassCard>
        ) : (
          <GlassCard variant="dark" className="purple-glow">
            <h2 className="text-xl font-bold mb-6 text-white">
              ✨ Your Favorites ({favorites.length})
            </h2>

            <div className="image-grid">
              {favorites.map((favorite) => (
                <div key={favorite.id} className="image-card group relative">
                  <img
                    src={favorite.supabase_url || favorite.original_url}
                    alt={`Favorite: ${favorite.prompt}`}
                    className="w-full h-32 object-cover cursor-pointer hover:scale-105 transition-transform"
                    loading="lazy"
                    onClick={() => setSelectedImage(favorite.supabase_url || favorite.original_url)}
                    onError={(e) => {
                      // Fallback to original URL if Supabase URL fails
                      if (favorite.supabase_url && e.currentTarget.src === favorite.supabase_url) {
                        e.currentTarget.src = favorite.original_url
                      }
                    }}
                  />

                  {/* Hover icons */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="flex gap-1">
                      {/* Download */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownloadImage(favorite)
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
                          setSelectedImage(favorite.supabase_url || favorite.original_url)
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
                          handleDeleteFavorite(favorite.id)
                        }}
                        className="w-8 h-8 bg-black/70 hover:bg-red-600/90 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                        title="Remove favorite"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Image info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs truncate">
                      {favorite.prompt}
                    </p>
                    <p className="text-gray-300 text-xs">
                      {new Date(favorite.saved_at).toLocaleDateString()}
                    </p>
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
                alt="Favorited image fullscreen"
                className="w-full h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
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