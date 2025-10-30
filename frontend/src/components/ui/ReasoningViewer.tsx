'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Brain } from 'lucide-react'

interface ReasoningViewerProps {
  /** The reasoning content to display */
  content: string
  /** Whether the reasoning block is currently being streamed */
  isStreaming?: boolean
  /** Optional CSS classes */
  className?: string
}

/**
 * Component to display Extended Thinking reasoning in a collapsible format
 * Shows thinking process inline within the message (not a floating modal)
 */
export const ReasoningViewer: React.FC<ReasoningViewerProps> = ({
  content,
  isStreaming = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  // Don't render if no content and not streaming
  if (!content && !isStreaming) {
    return null
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div className={`reasoning-viewer mb-2 ${className}`}>
      {/* Header - simple, no border, just text */}
      <div
        onClick={toggleExpanded}
        className="flex items-center space-x-2 px-2 py-1.5 cursor-pointer hover:bg-gray-800/30 transition-colors rounded"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggleExpanded()
          }
        }}
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Hide thinking process' : 'Show thinking process'}
      >
        {/* Brain icon */}
        <Brain className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />

        {/* Text */}
        <span className="text-xs font-normal text-gray-400 flex-grow">
          {isStreaming && !content ? 'Thinking...' : 'Proceso de pensamiento'}
        </span>

        {/* Loading spinner when streaming */}
        {isStreaming && (
          <div className="w-2.5 h-2.5 border border-gray-400 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
        )}

        {/* Character count (if content exists) */}
        {content && (
          <span className="text-xs text-gray-500 flex-shrink-0">
            {content.length} chars
          </span>
        )}

        {/* Expand/collapse icon */}
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
        )}
      </div>

      {/* Content - collapsible, only shown when expanded, no border */}
      {isExpanded && content && (
        <div className="mt-1 px-3 py-2 bg-gray-900/30">
          <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono leading-relaxed">
            {content}
          </pre>
        </div>
      )}
    </div>
  )
}
