'use client'

import { Brain } from 'lucide-react'

interface ThinkingModalProps {
  isVisible: boolean
  step: string
  message: string
  elapsed: number
}

export function ThinkingModal({ isVisible, step, message, elapsed }: ThinkingModalProps) {
  if (!isVisible) return null

  // Determine if this is PRE-RESPONSE thinking (Extended Thinking)
  const isPreResponseThinking = step === 'pre_response_thinking' || step === 'analyzing'
  const displayTitle = isPreResponseThinking ? 'Extended Thinking' : step.replace('_', ' ')

  return (
    <div className="fixed bottom-24 right-4 z-50 animate-slide-up">
      <div className={`bg-gradient-to-br backdrop-blur-md rounded-lg shadow-2xl border p-4 max-w-sm ${
        isPreResponseThinking
          ? 'from-purple-900/95 to-indigo-900/95 border-purple-400/50'
          : 'from-purple-900/90 to-black/90 border-purple-500/30'
      }`}>
        <div className="flex items-center gap-3">
          {/* Animated brain icon */}
          <div className="relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isPreResponseThinking
                ? 'bg-purple-500/30 animate-pulse'
                : 'bg-purple-500/20 animate-pulse'
            }`}>
              <Brain className={`w-6 h-6 ${
                isPreResponseThinking
                  ? 'text-purple-200 animate-spin'
                  : 'text-purple-300'
              }`} style={{ animationDuration: '3s' }} />
            </div>
            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full animate-ping ${
              isPreResponseThinking
                ? 'bg-purple-400'
                : 'bg-purple-500'
            }`} />
          </div>

          <div className="flex-1">
            <p className={`font-semibold text-sm capitalize ${
              isPreResponseThinking
                ? 'text-purple-100'
                : 'text-white'
            }`}>
              {displayTitle}
            </p>
            <p className="text-xs text-purple-300 mt-0.5">
              {message}
            </p>
            <p className="text-xs text-purple-400 mt-1 font-mono">
              {elapsed}ms elapsed
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
