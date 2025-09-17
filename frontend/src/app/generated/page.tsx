'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import GlassCard from '@/components/ui/glass-card'
import { LiquidButton } from '@/components/ui/liquid-glass-button'
import { Download, Maximize2, ArrowLeft, Heart, Trash2, Clock, Tag } from 'lucide-react'

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

export default function GeneratedPage() {
  const router = useRouter()
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedSession, setSelectedSession] = useState<string>('')

  useEffect(() => {
    loadGeneratedImages()
  }, [selectedSession])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedImage) {
        setSelectedImage(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedImage])

  const loadGeneratedImages = async () => {
    try {
      setLoading(true)
      const sessionParam = selectedSession ? `&session=${selectedSession}` : ''
      const response = await fetch(`/api/generated?limit=100${sessionParam}`)
      const data = await response.json()

      if (response.ok) {
        setGeneratedImages(data.images || [])
      } else {
        console.error('Failed to load generated images:', data.error)
      }
    } catch (error) {
      console.error('Error loading generated images:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveToFavorites = async (image: GeneratedImage) => {
    try {
      console.log('💾 Saving to favorites:', image.image_id)

      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageId: image.image_id,
          originalUrl: image.replicate_url,
          prompt: image.prompt,
        }),
      })

      if (response.ok) {
        // Show success notification
        const notification = document.createElement('div')
        notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in'
        notification.textContent = '✅ Saved to favorites!'
        document.body.appendChild(notification)
        setTimeout(() => notification.remove(), 3000)
      } else {
        throw new Error('Failed to save to favorites')
      }
    } catch (error) {
      console.error('❌ Failed to save favorite:', error)
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in'
      notification.textContent = '❌ Failed to save to favorites'
      document.body.appendChild(notification)
      setTimeout(() => notification.remove(), 5000)
    }
  }

  const handleDownloadImage = async (image: GeneratedImage) => {
    try {
      const response = await fetch(image.replicate_url)
      const blob = await response.blob()

      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      const cleanPrompt = image.prompt.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50)
      link.download = `generated_${cleanPrompt}_${image.image_id}.webp`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download image:', error)
      alert('❌ Failed to download image')
    }
  }

  const handleDeleteGenerated = async (imageId: string) => {
    if (!confirm('Are you sure you want to remove this generated image from history?')) return

    try {
      const response = await fetch(`/api/generated?id=${imageId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setGeneratedImages(prev => prev.filter(img => img.id !== imageId))

        // Show success notification
        const notification = document.createElement('div')
        notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in'
        notification.textContent = '✅ Removed from history!'
        document.body.appendChild(notification)
        setTimeout(() => notification.remove(), 3000)
      } else {
        throw new Error('Failed to delete generated image')
      }
    } catch (error) {
      console.error('Error deleting generated image:', error)
      alert('❌ Failed to remove image')
    }
  }

  // Get unique generation sessions for filtering
  const uniqueSessions = Array.from(new Set(generatedImages.map(img => img.generation_session)))
    .sort((a, b) => b.localeCompare(a))

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
                🎨 Generated Images
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {/* Session Filter */}
              {uniqueSessions.length > 1 && (
                <select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  className="px-3 py-2 bg-black/30 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-400"
                >
                  <option value="">All Sessions</option>
                  {uniqueSessions.map((session) => (
                    <option key={session} value={session}>
                      {session.replace('chat_', 'Session ')}
                    </option>
                  ))}
                </select>
              )}

              <LiquidButton
                onClick={loadGeneratedImages}
                variant="space"
                size="sm"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </LiquidButton>
            </div>
          </div>
          <p className="text-gray-300 mt-2">
            History of all images generated through the chat agent
          </p>
        </div>

        {/* Generated Images Grid */}
        {loading ? (
          <GlassCard variant="dark" className="purple-glow">
            <div className="flex items-center justify-center py-12">
              <div className="text-white">Loading generated images...</div>
            </div>
          </GlassCard>
        ) : generatedImages.length === 0 ? (
          <GlassCard variant="dark" className="purple-glow">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎨</div>
              <h2 className="text-2xl font-bold text-white mb-2">No Generated Images Yet</h2>
              <p className="text-gray-300 mb-6">
                Start using the chat agent to generate images and they'll appear here automatically!
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
              ✨ Generated History ({generatedImages.length} images)
            </h2>

            <div className="image-grid">
              {generatedImages.map((image) => (
                <div key={image.id} className="image-card group relative">
                  <img
                    src={image.replicate_url}
                    alt={`Generated: ${image.prompt}`}
                    className="w-full h-32 object-cover cursor-pointer hover:scale-105 transition-transform"
                    loading="lazy"
                    onClick={() => setSelectedImage(image.replicate_url)}
                  />

                  {/* Combined Badge */}
                  {image.is_combined && (
                    <div className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                      🔄 Combined
                    </div>
                  )}

                  {/* Hover icons */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="flex gap-1">
                      {/* Download */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownloadImage(image)
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
                          setSelectedImage(image.replicate_url)
                        }}
                        className="w-8 h-8 bg-black/70 hover:bg-black/90 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                        title="View fullscreen"
                      >
                        <Maximize2 className="w-4 h-4 text-white" />
                      </button>

                      {/* Save to Favorites */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSaveToFavorites(image)
                        }}
                        className="w-8 h-8 bg-black/70 hover:bg-purple-600/90 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                        title="Save to favorites"
                      >
                        <Heart className="w-4 h-4 text-white" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteGenerated(image.id)
                        }}
                        className="w-8 h-8 bg-black/70 hover:bg-red-600/90 backdrop-blur-sm rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
                        title="Remove from history"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Image info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs truncate">
                      {image.prompt}
                    </p>
                    <div className="flex items-center justify-between text-gray-300 text-xs mt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(image.generated_at).toLocaleDateString()}</span>
                      </div>
                      {image.model_version && (
                        <span className="text-purple-300 text-xs">
                          {image.model_version.split('/').pop()?.split(':')[0]}
                        </span>
                      )}
                    </div>
                    {image.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Tag className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-400 text-xs truncate">
                          {image.tags.join(', ')}
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
                alt="Generated image fullscreen"
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