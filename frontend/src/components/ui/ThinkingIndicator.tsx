'use client'

import { Brain } from 'lucide-react'

interface ThinkingIndicatorProps {
  isVisible: boolean
  message?: string
  elapsed?: number
}

/**
 * ThinkingIndicator - Minimal badge showing when Claude is thinking
 *
 * UX: Bottom-left corner, text with blinking animation
 * Shows during Extended Thinking phase (before response/tool use)
 */
export function ThinkingIndicator({
  isVisible,
  message = 'Claude está pensando...',
  elapsed = 0
}: ThinkingIndicatorProps) {
  if (!isVisible) return null

  return (
    <div className="fixed bottom-20 left-4 z-40 animate-fade-in">
      <div className="flex items-center gap-2 bg-purple-900/90 backdrop-blur-md rounded-lg px-4 py-2.5 border border-purple-500/40 shadow-lg">
        {/* Pulsing dot */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-3 h-3 bg-purple-400 rounded-full animate-ping opacity-75" />
          <div className="relative w-2 h-2 bg-purple-400 rounded-full" />
        </div>

        {/* Brain icon */}
        <Brain className="w-4 h-4 text-purple-300" />

        {/* Message with blink animation */}
        <span className="text-sm text-purple-200 font-medium animate-blink">
          {message}
        </span>

        {/* Elapsed time (optional) */}
        {elapsed > 0 && (
          <span className="text-xs text-purple-400 ml-1">
            ({(elapsed / 1000).toFixed(1)}s)
          </span>
        )}
      </div>
    </div>
  )
}
