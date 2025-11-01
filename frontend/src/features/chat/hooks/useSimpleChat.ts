/**
 * useSimpleChat - Simple chat hook WITHOUT SSE streaming
 *
 * NO más complejidad de SSE, NO más .next corruption, NO más headaches.
 * Simple fetch → wait → response → done.
 */

import { useState } from 'react'
import { useChatStore } from '../stores/chatStore'
import type { SelectedImage } from '@/shared/contexts/SelectedImagesContext'

interface SendMessageOptions {
  selectedImages?: SelectedImage[]
  pastedImages?: Array<{
    base64: string
    mimeType: string
    size: number
  }>
  userConfig?: any
}

export function useSimpleChat() {
  const [isSending, setIsSending] = useState(false)
  const { addMessage, messages, selectedModel } = useChatStore()

  const sendMessage = async (
    message: string,
    options: SendMessageOptions = {}
  ) => {
    if (!message.trim() || isSending) return

    try {
      setIsSending(true)

      // Add user message immediately
      const userMessageId = `user_${Date.now()}`
      addMessage({
        id: userMessageId,
        role: 'user',
        content: message,
        timestamp: new Date()
      })

      // 🔍 DEBUG LOG (backend logging will show if data arrives)
      console.log('📤 Sending request to /api/chat:')
      console.log('   selectedImages:', options.selectedImages?.length || 0)
      console.log('   pastedImages:', options.pastedImages?.length || 0)
      console.log('   model:', selectedModel)

      // Build request body
      const requestBody = {
        message,
        messages: messages.slice(-10), // Last 10 messages for context
        selectedImages: options.selectedImages || [],
        pastedImages: options.pastedImages || [],
        userConfig: options.userConfig,
        model: selectedModel
      }

      // Simple fetch - NO SSE, NO streaming, NO complexity
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      // Add assistant response
      const assistantMessageId = `assistant_${Date.now()}`
      addMessage({
        id: assistantMessageId,
        role: 'assistant',
        content: data.response || 'No response from AI',
        timestamp: new Date(),
        reasoning: data.reasoning_details ? JSON.stringify(data.reasoning_details) : undefined,
        tool_used: data.tool_used,
        model: data.model_used
      })

      // If images were generated, trigger reload
      if (data.images && data.images.length > 0) {
        console.log(`✅ ${data.images.length} images generated, triggering reload...`)
        window.dispatchEvent(new CustomEvent('imagesUpdated', {
          detail: {
            type: data.tool_used || 'generate',
            count: data.images.length,
            endpoint: 'simple_chat'
          }
        }))
      }

      console.log('✅ Message sent successfully')

    } catch (error) {
      console.error('❌ Error sending message:', error)
      const errorMessageId = `error_${Date.now()}`
      addMessage({
        id: errorMessageId,
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      })
    } finally {
      setIsSending(false)
    }
  }

  return {
    sendMessage,
    isSending
  }
}
