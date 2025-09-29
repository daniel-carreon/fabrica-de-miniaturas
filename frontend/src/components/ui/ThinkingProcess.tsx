'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Brain, Eye, Settings, Wrench } from 'lucide-react'
import { LiquidButton } from '@/components/ui/liquid-glass-button'
import GlassCard from '@/components/ui/glass-card'

interface ReasoningStep {
  type: 'summary' | 'raw_text' | 'encrypted'
  content: string
}

interface ThinkingProcessProps {
  reasoning_details?: ReasoningStep[]
  tool_used?: string
  model?: string
  selectedImagesCount?: number
  className?: string
}

export default function ThinkingProcess({
  reasoning_details,
  tool_used,
  model,
  selectedImagesCount = 0,
  className = ''
}: ThinkingProcessProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Don't render if no reasoning details
  if (!reasoning_details || reasoning_details.length === 0) {
    return null
  }

  const getToolIcon = (tool: string) => {
    switch (tool) {
      case 'generate_images':
        return '🎨'
      case 'generate_avatar':
        return '👤'
      case 'create_images':
        return '🎨'
      case 'combine_images':
        return '🔄'
      default:
        return '🤖'
    }
  }

  const getToolName = (tool: string) => {
    switch (tool) {
      case 'generate_images':
        return 'Image Generation'
      case 'generate_avatar':
        return 'Avatar Generation'
      case 'create_images':
        return 'Create from Scratch'
      case 'combine_images':
        return 'Image Combination'
      default:
        return 'AI Processing'
    }
  }

  return (
    <div className={`${className}`}>
      {/* Compact Header - Always Visible */}
      <div className="flex items-center gap-3 p-3 bg-black/30 border border-purple-500/20 rounded-lg backdrop-blur-sm">
        {/* Tool Indicator */}
        {tool_used && (
          <div className="flex items-center gap-2">
            <span className="text-lg">{getToolIcon(tool_used)}</span>
            <span className="text-sm text-purple-200">{getToolName(tool_used)}</span>
          </div>
        )}

        {/* Vision Indicator */}
        {selectedImagesCount > 0 && (
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-blue-200">{selectedImagesCount} images</span>
          </div>
        )}

        {/* Model Indicator */}
        {model && (
          <div className="flex items-center gap-1">
            <Brain className="w-4 h-4 text-green-400" />
            <span className="text-xs text-green-200">{model.replace('openai/', '')}</span>
          </div>
        )}

        {/* Reasoning Indicator */}
        <div className="flex items-center gap-1">
          <Settings className="w-4 h-4 text-orange-400" />
          <span className="text-xs text-orange-200">{reasoning_details.length} steps</span>
        </div>

        {/* Expand Button */}
        <LiquidButton
          onClick={() => setIsExpanded(!isExpanded)}
          variant="ghost"
          size="sm"
          className="ml-auto"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </LiquidButton>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-2">
          <GlassCard variant="dark" className="max-h-60 overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-purple-500/20 pb-2">
                <Wrench className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-200">Thinking Process</span>
              </div>

              {reasoning_details.map((step, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                      <span className="text-xs text-purple-300">{index + 1}</span>
                    </div>
                    <span className="text-xs text-purple-300 uppercase tracking-wider">
                      {step.type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="pl-8">
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {step.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  )
}