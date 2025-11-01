'use client'

import { useState, useEffect } from 'react'
import { useChatStore, ChatMessage } from '../stores/chatStore'
import { useImageStore } from '@/shared/stores/imageStore'
import { useSelectedImages } from '@/shared/contexts/SelectedImagesContext'
import { useImageConfig } from '@/shared/stores/imageConfigStore'
import { useModelStore } from '@/shared/stores/modelStore'
import { useConversationStore } from '@/shared/stores/conversationStore'
import { backendFetch } from '@/shared/lib/portDetection'
import GlassCard from '@/components/ui/glass-card'
import { LiquidButton } from '@/components/ui/liquid-glass-button'
import PromptsPanel from '@/components/ui/PromptsPanel'
import ImageConfigPanel from '@/components/ui/ImageConfigPanel'
import ModelSelector from '@/components/ui/ModelSelector'
import ThinkingDisplay from '@/components/ui/ThinkingDisplay'
import ThinkingProcess from '@/components/ui/ThinkingProcess'
import AgentPipeline, { PipelineStage } from '@/components/ui/AgentPipeline'
import { MessageRenderer } from '@/components/ui/MessageRenderer'
import { ChevronDown, ChevronUp, Copy, Check, Paperclip, Star, Trash2 } from 'lucide-react'

interface ReasoningStep {
  type: 'summary' | 'raw_text' | 'encrypted'
  content: string
}

interface PastedImage {
  id: string
  base64: string
  preview: string
}

export default function ChatAgent() {
  const [input, setInput] = useState('')
  const [showPrompts, setShowPrompts] = useState(false)
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([])
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [pastedImages, setPastedImages] = useState<PastedImage[]>([])
  const [viewMode, setViewMode] = useState<'agent' | 'conversations'>('agent') // Toggle between agent and conversations
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [lastThinking, setLastThinking] = useState<string | null>(null) // Store latest thinking process

  const {
    messages,
    isLoading,
    addMessage,
    setLoading,
    clearMessages
  } = useChatStore()

  const { setGeneratedImages, loadImagesFromDatabase } = useImageStore()
  const { selectedImages, clearSelection, handleImageSelect } = useSelectedImages()
  const { config, updateConfig, activePreset } = useImageConfig()
  const { selectedModel, enableThinking } = useModelStore()

  // Conversation management
  const {
    conversations,
    currentConversationId,
    loading: conversationsLoading,
    error: conversationsError,
    createConversation,
    setCurrentConversation,
    loadConversations,
    deleteConversation,
    toggleFavorite,
    updateConversationTitle,
    clearError,
    addMessage: addConversationMessage,
    isPanelOpen,
    togglePanel
  } = useConversationStore()

  // 🔄 Load images from database on component mount (fixes refresh issue)
  // And initialize conversation if needed
  useEffect(() => {
    loadImagesFromDatabase()
    loadConversations() // Load all conversations for the panel

    // Initialize conversation: create new if none exists
    if (!currentConversationId) {
      createConversation().catch(err => {
        console.error('❌ Failed to create initial conversation:', err)
      })
    }
  }, [])

  const handleCopy = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000) // Reset after 2 seconds
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      // Check if it's an image
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault() // Prevent default paste behavior

        const blob = item.getAsFile()
        if (!blob) continue

        // Convert to base64
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64String = reader.result as string
          const pastedImage: PastedImage = {
            id: `pasted_${Date.now()}_${i}`,
            base64: base64String,
            preview: base64String // Use same for preview
          }

          setPastedImages(prev => [...prev, pastedImage])
          console.log('📸 Image pasted:', pastedImage.id)
        }
        reader.readAsDataURL(blob)
      }
    }
  }

  const removePastedImage = (id: string) => {
    setPastedImages(prev => prev.filter(img => img.id !== id))
  }

  const handleInjectPrompt = (prompt: string) => {
    setInput(prev => {
      const newInput = prev.trim() ? `${prev}\n\n${prompt}` : prompt
      return newInput
    })
    setShowPrompts(false) // Collapse panel after injection
  }

  // Conversation panel handlers
  const handleSelectConversation = async (id: string) => {
    try {
      await setCurrentConversation(id)
      setViewMode('agent') // Switch back to agent view after selecting
    } catch (e) {
      console.error('Failed to select conversation')
    }
  }

  const handleStartEdit = (id: string, currentTitle: string) => {
    setEditingId(id)
    setEditTitle(currentTitle)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
  }

  const handleSaveTitle = async (id: string) => {
    if (editTitle.trim()) {
      try {
        await updateConversationTitle(id, editTitle)
        handleCancelEdit()
      } catch (e) {
        console.error('Failed to update title')
      }
    }
  }

  // Sort conversations: Favorites first, then recent
  const sortedConversations = [...conversations].sort((a, b) => {
    if (a.is_favorite !== b.is_favorite) {
      return a.is_favorite ? -1 : 1
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

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
          conversation_id: currentConversationId, // Include conversation context
          messages: messages, // Context history
          selectedImages: selectedImages, // Include selected images for combination tool
          userConfig: config, // Include user configuration for enhanced prompts
          pastedImages: pastedImages.map(img => img.base64), // Include pasted images for vision
          selectedModel: selectedModel, // Pass selected model (haiku-4.5 or sonnet-4.5)
          enableThinking: enableThinking // Pass thinking setting
        }),
      })

      console.log('🎨 Using config:', {
        preset: activePreset || 'custom',
        style: config.style_preset,
        temperature: config.temperature,
        lighting: config.lighting_preference,
        mood: config.mood
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Chat request failed')
      }

      const data = await response.json()
      console.log('✅ OpenRouter response:', data)

      // Update pipeline if available
      if (data.pipeline && Array.isArray(data.pipeline)) {
        setPipelineStages(data.pipeline)
      }

      // If tool was used and returned images, add them to gallery
      if ((data.tool_used === 'generate_avatar' || data.tool_used === 'create_images' || data.tool_used === 'combine_images') && data.tool_result?.images) {
        console.log(`🎨 Processing ${data.tool_used} images from chat tool:`, data.tool_result)

        // Transform tool_result images to imageStore format with source marking
        const transformedImages = data.tool_result.images.map((img: any) => ({
          id: img.id,
          url: img.url,
          prompt: img.prompt,
          isSelected: false,
          createdAt: new Date(img.timestamp),
          source: data.tool_used === 'generate_avatar' ? 'flux_dani' :
                  data.tool_used === 'create_images' ? 'create_from_scratch' : 'nano_banana'
        }))

        // DON'T add images to store here - let page.tsx handle display after auto-save
        console.log('✅ Images will be added to gallery after auto-save completes:', transformedImages)

        // Clear selection after successful combination
        if (data.tool_used === 'combine_images') {
          clearSelection()
          console.log('🔗 Selected images cleared after successful combination')
        }

        // Auto-save images to correct endpoint based on tool used
        if (data.tool_used === 'generate_avatar' || data.tool_used === 'create_images' || data.tool_used === 'combine_images') {
          try {
            // 🎯 ROUTING CORRECTO: usar endpoint específico según tool_used
            const endpoint = data.tool_used === 'combine_images' ? '/api/combined' :
                           data.tool_used === 'create_images' ? '/api/created' : '/api/generated'
            const logType = data.tool_used === 'combine_images' ? 'combined images' :
                          data.tool_used === 'create_images' ? 'created images' : 'generated images'

            console.log(`💾 Auto-saving ${logType} to ${endpoint}...`)

            // 🔄 Payload específico según tool_used
            const payload = data.tool_used === 'combine_images'
              ? {
                  images: data.tool_result.images,
                  sourceImages: selectedImages, // Context de imágenes seleccionadas
                  combinationSession: `chat_combine_${Date.now()}`,
                  modelUsed: 'nano-banana'
                }
              : data.tool_used === 'create_images'
              ? {
                  images: data.tool_result.images,
                  modelVersion: 'gemini-2.5-flash',
                  modelParameters: {
                    tool_used: data.tool_used,
                    prompt: data.tool_result.prompt,
                    total: data.tool_result.total
                  },
                  generationSession: `chat_create_${Date.now()}`,
                  toolUsed: data.tool_used
                }
              : {
                  images: data.tool_result.images,
                  modelVersion: 'daniel-carreon/danielcarrong:56c9356f',
                  modelParameters: {
                    tool_used: data.tool_used,
                    prompt: data.tool_result.prompt,
                    total: data.tool_result.total
                  },
                  generationSession: `chat_avatar_${Date.now()}`,
                  toolUsed: data.tool_used
                }

            const autoSaveResponse = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload)
            })

            if (autoSaveResponse.ok) {
              const autoSaveData = await autoSaveResponse.json()
              console.log('✅ Images auto-saved to database:', autoSaveData.data.saved)

              // 🔄 TRIGGER RELOAD: Notify page.tsx to reload images after successful save
              const reloadEvent = new CustomEvent('imagesUpdated', {
                detail: {
                  type: data.tool_used,
                  endpoint: endpoint,
                  count: autoSaveData.data.saved
                }
              })
              window.dispatchEvent(reloadEvent)
              console.log(`🔄 Triggered reload event for ${logType}`)
            } else {
              console.warn('⚠️ Auto-save failed but continuing with UI update')
            }
          } catch (autoSaveError) {
            console.error('❌ Auto-save error:', autoSaveError)
            // Don't block UI if auto-save fails
          }
        }
      }

      // Extract thinking content from response for display
      if (data.reasoning_details && typeof data.reasoning_details === 'string') {
        setLastThinking(data.reasoning_details)
      } else if (data.reasoning_details && typeof data.reasoning_details === 'object' && data.reasoning_details.content) {
        setLastThinking(data.reasoning_details.content)
      }

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: data.response || 'Sorry, I could not process your request.',
        timestamp: new Date(),
        reasoning_details: data.reasoning_details,
        tool_used: data.tool_used,
        model: data.model,
        final_prompt: data.final_prompt,
        prompt_length: data.prompt_length
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
      setPastedImages([]) // Clear pasted images after sending
      // Limpia el pipeline después de 3 segundos
      setTimeout(() => {
        setPipelineStages([])
      }, 3000)
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
      {/* Header - Toggle between Agent and Conversations */}
      <GlassCard variant="dark" className="purple-glow mb-4">
        <div className="flex items-center gap-2">
          {/* Agent View Button */}
          <LiquidButton
            onClick={() => setViewMode('agent')}
            variant="space"
            size="sm"
            className={`flex-1 text-sm font-medium ${
              viewMode === 'agent' ? 'ring-2 ring-purple-400' : ''
            }`}
          >
            🤖 Agente
          </LiquidButton>

          {/* Conversations View Button */}
          <LiquidButton
            onClick={() => setViewMode('conversations')}
            variant="space"
            size="sm"
            className={`flex-1 text-sm font-medium ${
              viewMode === 'conversations' ? 'ring-2 ring-purple-400' : ''
            }`}
          >
            📋 Ver Todas
          </LiquidButton>
        </div>
      </GlassCard>

      {/* Conditional Content - Agent View or Conversations View */}
      {viewMode === 'agent' ? (
        <>
          {/* AGENT VIEW - Original Chat Interface */}
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
              {/* Message with Markdown Rendering */}
              <MessageRenderer
                id={message.id}
                role={message.role as 'user' | 'assistant'}
                content={message.content}
                timestamp={message.timestamp}
                onCopy={handleCopy}
                copiedMessageId={copiedMessageId ?? undefined}
              />

              {/* Thinking Process for AI messages */}
              {message.role === 'assistant' && (message.reasoning_details || message.tool_used || message.final_prompt) && (
                <div className="flex justify-start">
                  <div className="max-w-[80%]">
                    <ThinkingProcess
                      reasoning_details={message.reasoning_details}
                      tool_used={message.tool_used}
                      model={message.model}
                      selectedImagesCount={selectedImages.length}
                      final_prompt={message.final_prompt}
                      prompt_length={message.prompt_length}
                    />
                  </div>
                </div>
              )}
            </div>
          ))
        )}

            {/* Agent Pipeline - Shows real-time processing stages */}
            <AgentPipeline
              stages={pipelineStages}
              isVisible={isLoading || pipelineStages.length > 0}
            />
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
              {/* Thinking Display - Minimalista Toggle */}
              <ThinkingDisplay thinking={lastThinking} isLoading={isLoading} />

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

              {/* Pasted Images Preview */}
              {pastedImages.length > 0 && (
                <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-2 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <Paperclip size={14} className="text-blue-300" />
                    <span className="text-blue-200 text-xs">{pastedImages.length} pasted</span>
                    <div className="flex gap-1 flex-1">
                      {pastedImages.map((img) => (
                        <div key={img.id} className="relative group">
                          <div className="w-12 h-12 rounded border border-blue-400/50 overflow-hidden">
                            <img src={img.preview} alt="" className="w-full h-full object-cover" />
                          </div>
                          <button
                            onClick={() => removePastedImage(img.id)}
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
                onPaste={handlePaste}
                placeholder="Ask me to generate images, combine them, or paste screenshots (Ctrl+V)..."
                className="w-full px-4 py-3 bg-black/30 border border-purple-500/30 rounded-lg backdrop-blur-sm text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition-all resize-none"
                rows={3}
                disabled={isLoading}
              />

              {/* Model Selector and Controls */}
              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <button
                    onClick={() => setShowPrompts(!showPrompts)}
                    className="text-xs text-purple-300 hover:text-purple-200 transition-colors"
                  >
                    💡 {showPrompts ? 'Hide' : 'Show'} Prompts
                  </button>
                  <span className="text-xs text-purple-300 hidden sm:inline">
                    • Press Enter to send
                  </span>
                </div>

                {/* Minimalista Model Selector and Thinking Toggle */}
                <ModelSelector compact={true} />

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
        </>
      ) : (
        <>
          {/* CONVERSATIONS VIEW - List of all conversations */}
          <div className="flex-1 overflow-y-auto">
            {/* Nueva Conversación Button */}
            <div className="mb-4">
              <LiquidButton
                onClick={async () => {
                  try {
                    await createConversation()
                    setViewMode('agent') // Switch to agent view after creating
                    console.log('✅ Nueva conversación creada')
                  } catch (e) {
                    console.error('❌ Failed to create conversation')
                  }
                }}
                variant="space"
                size="sm"
                className="w-full text-sm font-medium"
              >
                ➕ Nueva Conversación
              </LiquidButton>
            </div>

            {/* Error Message */}
            {conversationsError && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-sm text-red-200 flex justify-between items-center backdrop-blur-sm">
                <span>{conversationsError}</span>
                <button
                  onClick={clearError}
                  className="text-red-300 hover:text-red-200 text-lg"
                >
                  ×
                </button>
              </div>
            )}

            {/* Conversations List */}
            {conversationsLoading ? (
              <GlassCard variant="dark" className="purple-glow">
                <div className="text-center text-purple-300 py-8">
                  <div className="animate-spin inline-block w-6 h-6 border-2 border-purple-600 border-t-purple-400 rounded-full" />
                  <p className="mt-3 text-sm">Cargando conversaciones...</p>
                </div>
              </GlassCard>
            ) : sortedConversations.length === 0 ? (
              <GlassCard variant="dark" className="purple-glow">
                <div className="text-center text-purple-300 py-8">
                  <p className="text-sm">Sin conversaciones aún</p>
                  <p className="text-xs mt-2 opacity-70">Crea una nueva para empezar</p>
                </div>
              </GlassCard>
            ) : (
              <div className="space-y-2">
                {sortedConversations.map((conv) => (
                  <GlassCard
                    key={conv.id}
                    variant={currentConversationId === conv.id ? 'purple' : 'dark'}
                    className={`group cursor-pointer transition-all ${
                      currentConversationId === conv.id
                        ? 'purple-glow ring-2 ring-purple-400'
                        : 'hover:purple-glow'
                    }`}
                  >
                    {editingId === conv.id ? (
                      // Edit mode
                      <input
                        autoFocus
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => handleSaveTitle(conv.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveTitle(conv.id)
                          if (e.key === 'Escape') handleCancelEdit()
                        }}
                        className="w-full bg-black/50 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 border border-purple-500/30"
                      />
                    ) : (
                      // View mode
                      <div onClick={() => handleSelectConversation(conv.id)}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-purple-100 hover:text-white transition">
                              {conv.title}
                            </p>
                            <p className="text-xs text-purple-300/70 mt-1">
                              {new Date(conv.created_at).toLocaleDateString('es-ES', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          {conv.is_favorite && (
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                          )}
                        </div>

                        {/* Action Buttons - Show on hover */}
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity pt-3 mt-3 border-t border-purple-500/20">
                          <LiquidButton
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStartEdit(conv.id, conv.title)
                            }}
                            variant="space"
                            size="sm"
                            className="flex-1 text-xs"
                          >
                            Editar
                          </LiquidButton>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleFavorite(conv.id)
                            }}
                            className="px-3 py-1 hover:bg-yellow-600/20 rounded-lg transition"
                            title="Marcar como favorito"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                conv.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-purple-400'
                              }`}
                            />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm('¿Eliminar esta conversación?')) {
                                deleteConversation(conv.id)
                              }
                            }}
                            className="px-3 py-1 hover:bg-red-600/20 rounded-lg transition"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                    )}
                  </GlassCard>
                ))}
              </div>
            )}

            {/* Footer - Stats */}
            <GlassCard variant="dark" className="mt-4 purple-glow">
              <div className="text-xs text-purple-300 space-y-1">
                <p>📊 {conversations.length} conversaciones</p>
                <p>⭐ {conversations.filter((c) => c.is_favorite).length} favoritas</p>
              </div>
            </GlassCard>
          </div>
        </>
      )}
    </div>
  )
}