'use client'

import { Zap, Brain } from 'lucide-react'

interface ModelSelectorProps {
  selectedModel: 'sonnet' | 'haiku'
  onModelChange: (model: 'sonnet' | 'haiku') => void
  className?: string
}

/**
 * ModelSelector - Minimal toggle between Sonnet 4.5 and Haiku 4.5
 *
 * Sonnet: Best for complex tasks, coding, agentic reasoning
 * Haiku: 3x cheaper, 2x faster, good for simple tasks
 */
export function ModelSelector({ selectedModel, onModelChange, className = '' }: ModelSelectorProps) {
  const models = [
    {
      id: 'sonnet' as const,
      label: 'Sonnet',
      icon: <Brain className="w-3.5 h-3.5" />,
      tooltip: 'Sonnet 4.5 - Best for complex tasks',
      color: 'purple'
    },
    {
      id: 'haiku' as const,
      label: 'Haiku',
      icon: <Zap className="w-3.5 h-3.5" />,
      tooltip: 'Haiku 4.5 - Fast & economical',
      color: 'cyan'
    }
  ]

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {models.map((model) => {
        const isSelected = selectedModel === model.id
        const colorClasses = {
          purple: isSelected ? 'bg-purple-500/20 text-purple-200' : 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/10',
          cyan: isSelected ? 'bg-cyan-500/20 text-cyan-200' : 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10'
        }

        return (
          <button
            key={model.id}
            onClick={() => onModelChange(model.id)}
            className={`p-2 transition-colors rounded-lg ${colorClasses[model.color as keyof typeof colorClasses]}`}
            title={model.tooltip}
            aria-label={`Switch to ${model.label}`}
          >
            <div className="flex items-center gap-1.5">
              {model.icon}
              <span className="text-xs font-medium">{model.label}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
