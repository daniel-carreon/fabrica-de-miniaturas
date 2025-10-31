import { useState, useCallback, useRef } from 'react'
import { useChatStore } from '../stores/chatStore'
import { useConversationStore } from '@/stores/conversationStore'
import type { ChatMessage } from '../stores/chatStore'

interface StreamEvent {
  type: 'start' | 'thinking' | 'thinking_start' | 'thinking_delta' | 'thinking_complete' | 'text_delta' |
        'tool_call_start' | 'tool_executing' | 'tool_call_result' | 'complete' | 'error' |
        'phase_change' | 'tool_calls_detected'  // NEW: Phase-based events
  [key: string]: any
}

interface PastedImageData {
  base64: string
  mimeType: string
  size: number
}

interface SendMessageOptions {
  selectedImages?: any[]
  pastedImages?: PastedImageData[]
  userConfig?: any
  enableThinking?: boolean
}

export function useStreamingChat() {
  const { addMessage, updateLastMessage } = useChatStore()
  const { currentConversationId } = useConversationStore()
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleStreamEvent = useCallback((
    event: StreamEvent,
    messageId: string,
    storeMethods: {
      appendToLastMessage: (id: string, chunk: string) => void
      appendReasoningToMessage: (id: string, reasoningChunk: string) => void
      updateMessageStreaming: (id: string, isStreaming: boolean) => void
      setThinking: (step: string | null, message?: string, elapsed?: number) => void
      updateToolExecution: (toolName: string | null, progress?: number, status?: 'idle' | 'running' | 'complete' | 'error') => void
    }
  ) => {
    const { appendToLastMessage, appendReasoningToMessage, updateMessageStreaming, setThinking, updateToolExecution } = storeMethods

    console.log('📨 SSE Event:', event.type, event)

    switch (event.type) {
      case 'start':
        console.log('🚀 Stream started')
        break

      case 'thinking':
        setThinking(event.step, event.message, event.elapsed_ms)
        break

      case 'thinking_start':
        // PRE-RESPONSE THINKING - Mark message as streaming reasoning
        console.log('🧠 Extended Thinking started - PRE-RESPONSE')
        updateMessageStreaming(messageId, true)
        break

      case 'thinking_delta':
        // Accumulate PRE-RESPONSE thinking text in the message inline
        console.log(`🧠 Thinking delta: ${event.content?.substring(0, 50)}... (total: ${event.total_length} chars)`)
        if (event.content) {
          appendReasoningToMessage(messageId, event.content)
        }
        break

      case 'thinking_complete':
        // PRE-RESPONSE THINKING complete - stop streaming indicator
        console.log(`✅ Extended Thinking complete: ${event.total_thinking_length} chars, ${event.elapsed_ms}ms`)
        updateMessageStreaming(messageId, false)
        break

      case 'text_delta':
        appendToLastMessage(messageId, event.content)
        break

      case 'tool_call_start':
        updateToolExecution(event.tool_name, 0, 'running')
        console.log('🔧 Tool called:', event.tool_name, event.tool_args)
        break

      case 'tool_executing':
        updateToolExecution(event.tool_name, event.progress || 50, 'running')
        break

      case 'tool_call_result':
        updateToolExecution(event.tool_name, 100, 'complete')
        console.log('✅ Tool result:', event.result)

        // 🚀 AUTO-SAVE: If images generated, save to Supabase and trigger gallery refresh
        if (event.result?.images && Array.isArray(event.result.images)) {
          const toolName = event.tool_name || 'unknown'
          console.log(`💾 Auto-saving ${event.result.images.length} images from ${toolName}...`)

          // Determine which endpoint to use based on tool
          let saveEndpoint = '/api/created' // Default for create_images
          if (toolName === 'generate_avatar') {
            saveEndpoint = '/api/generated'
          } else if (toolName === 'combine_images') {
            saveEndpoint = '/api/combined'
          }

          // Prepare images data for save
          const imagesToSave = event.result.images.map((img: any, idx: number) => ({
            id: `${toolName}_${Date.now()}_${idx}`,
            url: typeof img === 'string' ? img : (img.url || img),
            prompt: event.tool_args?.prompt || 'Generated from chat',
            timestamp: Date.now()
          }))

          // Save to Supabase (async, don't wait)
          fetch(saveEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              images: imagesToSave,
              modelVersion: 'gemini-2.5-flash',
              generationSession: `chat_${Date.now()}`,
              toolUsed: toolName
            })
          })
            .then(response => response.json())
            .then(data => {
              console.log(`✅ Auto-save complete: ${data.data?.saved || 0} images saved to ${saveEndpoint}`)

              // NOW trigger gallery refresh after successful save
              window.dispatchEvent(new CustomEvent('imagesUpdated', {
                detail: {
                  type: toolName,
                  count: data.data?.saved || event.result.images.length,
                  endpoint: saveEndpoint
                }
              }))
            })
            .catch(error => {
              console.error('❌ Auto-save failed:', error)
              // Still trigger refresh even if save fails (images might be in cache)
              window.dispatchEvent(new CustomEvent('imagesUpdated', {
                detail: {
                  type: toolName,
                  count: event.result.images.length,
                  endpoint: 'tool_execution'
                }
              }))
            })
        }
        break

      case 'phase_change':
        // NEW: Phase-based architecture - update agent phase
        console.log(`🔄 Phase change: ${event.from_phase} → ${event.to_phase}`)

        const { setAgentPhase } = useChatStore.getState()

        if (event.to_phase === 'thinking') {
          setAgentPhase({
            type: 'thinking',
            step: 'analyzing',
            message: 'Claude is analyzing...',
            elapsed: event.elapsed_ms || 0
          })
        } else if (event.to_phase === 'executing_tool') {
          setAgentPhase({
            type: 'executing_tool',
            toolName: event.tool_name || 'unknown',
            toolId: event.tool_id || '',
            progress: 0,
            status: 'starting'
          })
        } else if (event.to_phase === 'responding') {
          setAgentPhase({
            type: 'responding',
            textAccumulated: ''
          })
        } else if (event.to_phase === 'idle') {
          setAgentPhase({ type: 'idle' })
        }
        break

      case 'tool_calls_detected':
        // NEW: Multiple tools detected - log for debugging
        console.log(`🔧 Tools detected: ${event.count} tools - ${event.tools.map((t: any) => t.name).join(', ')}`)
        break

      case 'complete':
        console.log('✨ Stream complete:', event)
        setThinking(null)
        updateToolExecution(null)
        // Set phase to idle
        const { setAgentPhase: setPhaseComplete } = useChatStore.getState()
        setPhaseComplete({ type: 'idle' })
        break

      case 'error':
        console.error('❌ Stream error:', event.error)
        setThinking(null)
        updateToolExecution(null)
        // Set phase to idle on error
        const { setAgentPhase: setPhaseError } = useChatStore.getState()
        setPhaseError({ type: 'idle' })
        // Error is already shown in chat via appendToLastMessage
        break

      default:
        console.warn('Unknown event type:', event.type)
    }
  }, [])

  const sendStreamingMessage = useCallback(async (
    message: string,
    options?: SendMessageOptions
  ) => {
    setIsStreaming(true)

    // Create user message
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    }
    addMessage(userMsg)

    // Create empty assistant message
    const assistantMsgId = `msg_${Date.now()}_assistant`
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }
    addMessage(assistantMsg)
    setCurrentStreamId(assistantMsgId)

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()

    try {
      // Get chat store methods
      const { appendToLastMessage, appendReasoningToMessage, updateMessageStreaming, setThinking, updateToolExecution } = useChatStore.getState()

      // Fetch with streaming
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

      const requestBody = {
        message,
        messages: useChatStore.getState().messages.slice(-10), // Last 10 messages
        conversation_id: currentConversationId,
        selectedImages: options?.selectedImages || [],
        pastedImages: options?.pastedImages || [],
        userConfig: options?.userConfig,
        enable_thinking: options?.enableThinking || false,
        model: useChatStore.getState().selectedModel // Pass selected model to backend
      }

      console.log('🧠 Extended Thinking Request:', {
        enableThinking: options?.enableThinking,
        enable_thinking: requestBody.enable_thinking
      })

      const response = await fetch(`${backendUrl}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('ReadableStream not supported')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      // Process stream
      let eventCount = 0
      while (true) {
        const readStart = performance.now()
        const { done, value } = await reader.read()
        const readTime = performance.now() - readStart

        if (done) {
          console.log(`✅ Stream complete - Total events: ${eventCount}`)
          break
        }

        // Decode chunk
        const chunk = decoder.decode(value, { stream: true })
        console.log(`📦 Raw chunk received (${readTime.toFixed(2)}ms):`, chunk.substring(0, 100))
        buffer += chunk

        // Process complete lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: StreamEvent = JSON.parse(line.slice(6))
              eventCount++
              const processStart = performance.now()
              handleStreamEvent(event, assistantMsgId, {
                appendToLastMessage,
                appendReasoningToMessage,
                updateMessageStreaming,
                setThinking,
                updateToolExecution
              })
              const processTime = performance.now() - processStart
              console.log(`⚡ Event #${eventCount} processed in ${processTime.toFixed(2)}ms:`, event.type, event.type === 'text_delta' ? `"${event.content}"` : '')
            } catch (e) {
              console.error('Failed to parse SSE event:', line, e)
            }
          }
        }
      }

    } catch (error: any) {
      console.error('Stream error:', error)

      if (error.name === 'AbortError') {
        console.log('⏹️ Stream aborted by user')
        const { appendToLastMessage } = useChatStore.getState()
        appendToLastMessage(assistantMsgId, '\n\n⏹️ Stopped by user')
      } else {
        const { appendToLastMessage } = useChatStore.getState()
        appendToLastMessage(assistantMsgId, `\n\n❌ Error: ${error.message}`)
      }

    } finally {
      setIsStreaming(false)
      setCurrentStreamId(null)
      abortControllerRef.current = null

      // Clear thinking/tool state
      const { setThinking, updateToolExecution } = useChatStore.getState()
      setThinking(null)
      updateToolExecution(null)
    }
  }, [addMessage, currentConversationId])

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
    setCurrentStreamId(null)
  }, [])

  return {
    sendStreamingMessage,
    stopStreaming,
    isStreaming,
    currentStreamId
  }
}
