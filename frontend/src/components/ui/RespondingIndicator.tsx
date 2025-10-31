'use client'

import { MessageSquare } from 'lucide-react'

interface RespondingIndicatorProps {
  isVisible: boolean
  elapsed?: number
}

/**
 * RespondingIndicator - Minimal badge showing when Claude is generating final response
 *
 * UX: Bottom-left corner, green badge with pulsing animation
 * Shows during "responding" phase (after tool execution, Claude explains what was done)
 */
export function RespondingIndicator({
  isVisible,
  elapsed = 0
}: RespondingIndicatorProps) {
  if (!isVisible) return null

  return (
    <div className="fixed bottom-20 left-4 z-40 animate-fade-in">
      <div className="flex items-center gap-2 bg-green-900/90 backdrop-blur-md rounded-lg px-4 py-2.5 border border-green-500/40 shadow-lg">
        {/* Pulsing dot */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-3 h-3 bg-green-400 rounded-full animate-ping opacity-75" />
          <div className="relative w-2 h-2 bg-green-400 rounded-full" />
        </div>

        {/* MessageSquare icon */}
        <MessageSquare className="w-4 h-4 text-green-300" />

        {/* Message with blink animation */}
        <span className="text-sm text-green-200 font-medium animate-blink">
          Generando respuesta...
        </span>

        {/* Elapsed time (optional) */}
        {elapsed > 0 && (
          <span className="text-xs text-green-400 ml-1">
            ({(elapsed / 1000).toFixed(1)}s)
          </span>
        )}
      </div>
    </div>
  )
}
