'use client'

import { useState } from 'react'
import { ChevronDown, Brain } from 'lucide-react'
import GlassCard from './glass-card'

interface ThinkingDisplayProps {
  thinking?: string | any
  isLoading?: boolean
}

export default function ThinkingDisplay({ thinking, isLoading }: ThinkingDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!thinking && !isLoading) return null

  // Handle different thinking formats
  let thinkingContent = ''
  if (typeof thinking === 'string') {
    thinkingContent = thinking
  } else if (typeof thinking === 'object' && thinking?.content) {
    thinkingContent = thinking.content
  }

  return (
    <div className="space-y-2">
      {/* Thinking Header - Minimalista */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-900/20 border border-purple-500/30 hover:bg-purple-900/30 transition-all group"
      >
        <Brain size={16} className="text-purple-300" />
        <span className="text-sm text-purple-200 flex-1 text-left">
          {isLoading ? '💭 Pensando...' : '💭 Ver razonamiento'}
        </span>
        <ChevronDown
          size={16}
          className={`text-purple-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Thinking Content - Expandible */}
      {isExpanded && (
        <GlassCard className="bg-purple-900/10 border-purple-500/20 p-3 max-h-64 overflow-y-auto">
          <div className="text-xs text-purple-300 whitespace-pre-wrap leading-relaxed font-mono">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                <span>Analizando la solicitud...</span>
              </div>
            ) : thinkingContent ? (
              thinkingContent
            ) : (
              <span className="text-purple-400">Sin información de pensamiento disponible</span>
            )}
          </div>
        </GlassCard>
      )}
    </div>
  )
}
