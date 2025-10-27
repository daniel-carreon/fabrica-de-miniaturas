'use client'

import { useEffect, useState } from 'react'
import GlassCard from '@/components/ui/glass-card'

export interface PipelineStage {
  id: string
  name: string
  icon: string
  status: 'pending' | 'active' | 'complete' | 'error'
  message: string
  progress?: number
  details?: string[]
}

interface AgentPipelineProps {
  stages: PipelineStage[]
  isVisible: boolean
}

export default function AgentPipeline({ stages, isVisible }: AgentPipelineProps) {
  if (!isVisible || stages.length === 0) {
    return null
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return '✓'
      case 'active':
        return '⟳'
      case 'error':
        return '✗'
      default:
        return '○'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'text-green-400'
      case 'active':
        return 'text-yellow-400 animate-pulse'
      case 'error':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  return (
    <GlassCard variant="dark" className="mb-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-purple-500/20 pb-2">
          <span className="text-sm font-medium text-purple-200">AI Pipeline</span>
        </div>

        {stages.map((stage, index) => (
          <div key={stage.id} className="space-y-2">
            {/* Stage Header */}
            <div className="flex items-start gap-3">
              {/* Status indicator */}
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                stage.status === 'complete'
                  ? 'bg-green-500/20 border-green-500'
                  : stage.status === 'active'
                  ? 'bg-yellow-500/20 border-yellow-500'
                  : stage.status === 'error'
                  ? 'bg-red-500/20 border-red-500'
                  : 'bg-gray-500/20 border-gray-500'
              }`}>
                <span className={`text-xs font-bold ${getStatusColor(stage.status)}`}>
                  {getStatusIcon(stage.status)}
                </span>
              </div>

              {/* Stage content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{stage.icon}</span>
                  <span className="text-sm text-purple-200 font-medium">{stage.name}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{stage.message}</p>

                {/* Progress bar if progress is provided */}
                {stage.progress !== undefined && (
                  <div className="mt-2 w-full bg-gray-700/30 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-purple-500 h-full transition-all duration-300"
                      style={{ width: `${Math.min(stage.progress, 100)}%` }}
                    />
                  </div>
                )}

                {/* Details if provided */}
                {stage.details && stage.details.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {stage.details.map((detail, i) => (
                      <p key={i} className="text-xs text-gray-500">
                        • {detail}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Connector line to next stage */}
            {index < stages.length - 1 && (
              <div className="flex justify-center">
                <div className="w-0.5 h-4 bg-purple-500/20" />
              </div>
            )}
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
