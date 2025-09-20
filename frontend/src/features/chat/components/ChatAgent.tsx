'use client'

import { useState } from 'react'
import { useChatStore, ChatMessage } from '../stores/chatStore'
import { useImageStore } from '@/shared/stores/imageStore'
import { useSelectedImages } from '@/shared/contexts/SelectedImagesContext'
import { useImageConfig } from '@/shared/stores/imageConfigStore'
import { backendFetch } from '@/shared/lib/portDetection'
import GlassCard from '@/components/ui/glass-card'
import { LiquidButton } from '@/components/ui/liquid-glass-button'
import PromptsPanel from '@/components/ui/PromptsPanel'
import ImageConfigPanel from '@/components/ui/ImageConfigPanel'
import ThinkingProcess from '@/components/ui/ThinkingProcess'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface ReasoningStep {
  type: 'summary' | 'raw_text' | 'encrypted'
  content: string
}

export default function ChatAgent() {
  const [input, setInput] = useState('')
  const [showPrompts, setShowPrompts] = useState(false)
  const {
    messages,
    isLoading,
    addMessage,
    setLoading,
    clearMessages
  } = useChatStore()

  const { setGeneratedImages } = useImageStore()
  const { selectedImages, clearSelection, handleImageSelect } = useSelectedImages()
  const { config, updateConfig, activePreset } = useImageConfig()

  const handleInjectPrompt = (prompt: string) => {
    setInput(prev => {
      const newInput = prev.trim() ? `${prev}\n\n${prompt}` : prompt
      return newInput
    })
    setShowPrompts(false) // Collapse panel after injection
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    addMessage(userMessage)
    setInput('')
    setLoading(true)

    try {
      console.log('🤖 Sending message to OpenRouter:', userMessage.content)

      const response = await backendFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: userMessage.content,
          messages: messages, // Context history
          selectedImages: selectedImages, // Include selected images for combination tool
          userConfig: config // Include user configuration for enhanced prompts
        }),
      })

      console.log('🎨 Using config:', {
        preset: activePreset || 'custom',
        consistency: config.character_consistency,
        style: config.style_preset,
        temperature: config.temperature
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Chat request failed')
      }

      const data = await response.json()
      console.log('✅ OpenRouter response:', data)

      // If tool was used and returned images, add them to gallery
      if ((data.tool_used === 'generate_images' || data.tool_used === 'combine_images') && data.tool_result?.images) {
        console.log(`🎨 Processing ${data.tool_used} images from chat tool:`, data.tool_result)

        // Transform tool_result images to imageStore format with source marking
        const transformedImages = data.tool_result.images.map((img: any) => ({
          id: img.id,
          url: img.url,
          prompt: img.prompt,
          isSelected: false,
          createdAt: new Date(img.timestamp),
          source: data.tool_used === 'generate_images' ? 'flux_dani' : 'nano_banana'
        }))

        setGeneratedImages(transformedImages)
        console.log('✅ Images added to gallery:', transformedImages)

        // Clear selection after successful combination
        if (data.tool_used === 'combine_images') {
          clearSelection()
          console.log('🔗 Selected images cleared after successful combination')
        }

        // Auto-save generated images to database
        if (data.tool_used === 'generate_images' || data.tool_used === 'combine_images') {
          try {
            console.log('💾 Auto-saving generated images to database...')

            const autoSaveResponse = await fetch('/api/generated', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                images: data.tool_result.images,
                modelVersion: 'daniel-carreon/danielcarrong:56c9356f',
                modelParameters: {
                  tool_used: data.tool_used,
                  prompt: data.tool_result.prompt,
                  total: data.tool_result.total
                },
                generationSession: `chat_${Date.now()}`,
                toolUsed: data.tool_used // Pass tool_used for correct categorization
              })
            })

            if (autoSaveResponse.ok) {
              const autoSaveData = await autoSaveResponse.json()
              console.log('✅ Images auto-saved to database:', autoSaveData.data.saved)
            } else {
              console.warn('⚠️ Auto-save failed but continuing with UI update')
            }
          } catch (autoSaveError) {
            console.error('❌ Auto-save error:', autoSaveError)
            // Don't block UI if auto-save fails
          }
        }
      }

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: data.response || 'Sorry, I could not process your request.',
        timestamp: new Date(),
        reasoning_details: data.reasoning_details,
        tool_used: data.tool_used,
        model: data.model
      }

      addMessage(assistantMessage)

    } catch (error) {
      console.error('❌ Chat failed:', error)
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }
      addMessage(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <GlassCard variant="dark" className="purple-glow mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-white">🤖 AI Assistant</h2>
            <p className="text-xs md:text-sm text-purple-200 hidden sm:block">Powered by OpenRouter</p>
          </div>
          {/* Clear button only on desktop */}
          <div className="hidden md:block">
            <LiquidButton
              onClick={clearMessages}
              variant="space"
              size="sm"
              className="text-xs"
            >
              🗑️ Clear
            </LiquidButton>
          </div>
        </div>
      </GlassCard>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-3">
        {messages.length === 0 ? (
          <GlassCard variant="purple" className="purple-glow">
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🤖</div>
              <p className="text-purple-100 font-medium">Hello! I'm your AI assistant</p>
              <p className="text-purple-200 text-sm mt-2">
                I can help you generate images, combine them, and manage your files.
                What would you like to do?
              </p>
            </div>
          </GlassCard>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="space-y-2">
              <div
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-purple-600/80 text-white rounded-l-lg rounded-tr-lg'
                      : 'bg-black/60 text-purple-100 rounded-r-lg rounded-tl-lg border border-purple-500/30'
                  } backdrop-blur-sm p-3 shadow-lg`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <span className="text-xs opacity-60 mt-1 block">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>

              {/* Thinking Process for AI messages */}
              {message.role === 'assistant' && (message.reasoning_details || message.tool_used) && (
                <div className="flex justify-start">
                  <div className="max-w-[80%]">
                    <ThinkingProcess
                      reasoning_details={message.reasoning_details}
                      tool_used={message.tool_used}
                      model={message.model}
                      selectedImagesCount={selectedImages.length}
                    />
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-black/60 text-purple-100 rounded-r-lg rounded-tl-lg border border-purple-500/30 backdrop-blur-sm p-3 shadow-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>


      {/* Prompts Panel */}
      {showPrompts && (
        <div className="mb-4">
          <PromptsPanel onInjectPrompt={handleInjectPrompt} />
        </div>
      )}

      {/* Input */}
      <GlassCard variant="dark" className="purple-glow">
        <div className="space-y-3">
          {/* Selected Images - Minimalist */}
          {selectedImages.length > 0 && (
            <div className="bg-purple-600/20 border border-purple-500/30 rounded-lg p-2 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="text-purple-200 text-xs">{selectedImages.length}/8</span>
                <div className="flex gap-1">
                  {selectedImages.map((img) => (
                    <div key={img.id} className="relative group">
                      <div className="w-8 h-8 rounded border border-purple-400/50 overflow-hidden">
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <button
                        onClick={() => {
                          // Use the context function to deselect
                          handleImageSelect(img.id, img.url, img.source)
                        }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white text-xs rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me to generate images, combine them, or anything else..."
            className="w-full px-4 py-3 bg-black/30 border border-purple-500/30 rounded-lg backdrop-blur-sm text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition-all resize-none"
            rows={3}
            disabled={isLoading}
          />
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPrompts(!showPrompts)}
                className="text-xs text-purple-300 hover:text-purple-200 transition-colors"
              >
                💡 {showPrompts ? 'Hide' : 'Show'} Prompts
              </button>
              <span className="text-xs text-purple-300 hidden sm:inline">
                • Press Enter to send, Shift+Enter for new line
              </span>
            </div>
            <LiquidButton
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              variant="space"
              size="sm"
              className="disabled:opacity-50"
            >
              {isLoading ? '⏳' : '🚀'} <span className="hidden sm:inline">Send</span>
            </LiquidButton>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}