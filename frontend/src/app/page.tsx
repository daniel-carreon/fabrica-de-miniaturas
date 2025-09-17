'use client'

import { useState, useEffect } from 'react'
import { useImageStore } from '@/shared/stores/imageStore'
import GlassCard from '@/components/ui/glass-card'
import { LiquidButton } from '@/components/ui/liquid-glass-button'

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

export default function HomePage() {
  const [prompt, setPrompt] = useState('')
  const [numImages, setNumImages] = useState(10)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const {
    isGenerating,
    generatedImages,
    setGenerating,
    setGeneratedImages,
    clearGenerated
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

  const handleSaveFavorite = async (image: { id: string; url: string; prompt: string }) => {
    try {
      console.log('💾 Saving to favorites:', image.id)

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

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save favorite')
      }

      const data = await response.json()
      console.log('✅ Successfully saved to favorites:', data)
      alert('✅ Image saved to favorites!')

    } catch (error) {
      console.error('❌ Failed to save favorite:', error)
      alert(`❌ Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Generate Images Section - Hidden: Now using Chat Agent */}
      {false && (
        <GlassCard variant="dark" className="purple-glow">
          <h2 className="text-xl font-bold mb-6 text-white">🎨 Generate Images</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium mb-2 text-purple-200">
                Describe your image
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="DANI portrait for tech review thumbnail"
                className="w-full px-4 py-3 bg-black/30 border border-purple-500/30 rounded-lg backdrop-blur-sm text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition-all"
                rows={3}
                disabled={isGenerating}
              />
            </div>
            <div>
              <label htmlFor="numImages" className="block text-sm font-medium mb-2 text-purple-200">
                Number of images: <span className="text-purple-400 font-bold">{numImages}</span>
              </label>
              <input
                id="numImages"
                type="range"
                min="1"
                max="10"
                value={numImages}
                onChange={(e) => setNumImages(parseInt(e.target.value))}
                className="w-full h-2 bg-purple-900/30 rounded-lg appearance-none cursor-pointer slider accent-purple-500"
                disabled={isGenerating}
              />
              <div className="flex justify-between text-xs text-purple-300 mt-1">
                <span>1</span>
                <span>5</span>
                <span>10</span>
              </div>
            </div>
            <LiquidButton
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              variant="space"
              size="xl"
              className="disabled:opacity-50"
            >
              {isGenerating ? '🚀 Generating...' : `✨ Generate ${numImages} Images`}
            </LiquidButton>
          </div>
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

      {/* Results Grid */}
      {generatedImages.length > 0 && (
        <GlassCard variant="dark" className="purple-glow">
          <h2 className="text-xl font-bold mb-6 text-white">
            ✨ Generated Images ({generatedImages.length})
          </h2>
          <div className="image-grid">
            {generatedImages.map((image) => (
              <div key={image.id} className="image-card group">
                <img
                  src={image.url}
                  alt={`Generated from: ${image.prompt}`}
                  className="w-full h-32 object-cover cursor-pointer hover:scale-105 transition-transform"
                  loading="lazy"
                  onClick={() => setSelectedImage(image.url)}
                  onError={(e) => {
                    console.error('❌ Image failed to load:')
                    console.error('  URL:', image.url)
                    console.error('  Type of URL:', typeof image.url)
                    console.error('  Image object:', image)
                    console.error('  Error event:', e)
                    e.currentTarget.style.border = '2px solid red'
                    e.currentTarget.style.backgroundColor = 'rgba(255, 0, 0, 0.1)'
                  }}
                  onLoad={() => console.log('✅ Image loaded successfully:', image.url)}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all">
                  <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <LiquidButton
                      onClick={() => handleSaveFavorite(image)}
                      variant="space"
                      size="sm"
                      className="w-full"
                    >
                      ❤️ Save
                    </LiquidButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Empty State */}
      {!isGenerating && generatedImages.length === 0 && (
        <GlassCard variant="dark" className="purple-glow">
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-lg font-medium text-white mb-2">Ready to create</h3>
            <p className="text-purple-200">
              Enter a prompt above to generate 10 personalized images using your fine-tuned model
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
    </div>
  )
}