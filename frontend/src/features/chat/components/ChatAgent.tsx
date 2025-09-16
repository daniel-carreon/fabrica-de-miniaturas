'use client'

import { useState } from 'react'
import { useChatStore } from '../stores/chatStore'
import GlassCard from '@/components/ui/glass-card'
import { LiquidButton } from '@/components/ui/liquid-glass-button'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function ChatAgent() {
  const [input, setInput] = useState('')
  const {
    messages,
    isLoading,
    addMessage,
    setLoading,
    clearMessages
  } = useChatStore()

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

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          messages: messages // Context history
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Chat request failed')
      }

      const data = await response.json()
      console.log('✅ OpenRouter response:', data)

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: data.response || 'Sorry, I could not process your request.',
        timestamp: new Date()
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
            <h2 className="text-lg font-bold text-white">🤖 AI Assistant</h2>
            <p className="text-sm text-purple-200">Powered by OpenRouter</p>
          </div>
          <LiquidButton
            onClick={clearMessages}
            variant="space"
            size="sm"
            className="text-xs"
          >
            🗑️ Clear
          </LiquidButton>
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
            <div
              key={message.id}
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

      {/* Input */}
      <GlassCard variant="dark" className="purple-glow">
        <div className="space-y-3">
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
            <span className="text-xs text-purple-300">
              Press Enter to send, Shift+Enter for new line
            </span>
            <LiquidButton
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              variant="space"
              size="sm"
              className="disabled:opacity-50"
            >
              {isLoading ? '⏳' : '🚀'} Send
            </LiquidButton>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}