'use client'

import { useModelStore } from '@/shared/stores/modelStore'
import { Brain } from 'lucide-react'

interface ModelSelectorProps {
  compact?: boolean
}

export default function ModelSelector({ compact = false }: ModelSelectorProps) {
  const { selectedModel, setSelectedModel, enableThinking, setEnableThinking } = useModelStore()

  if (compact) {
    // Minimalista inline version for chat input area
    return (
      <div className="flex items-center gap-2 text-xs">
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value as 'haiku-4.5' | 'sonnet-4.5')}
          className="bg-purple-900/30 border border-purple-500/30 rounded px-2 py-1 text-purple-200 hover:bg-purple-800/30 focus:outline-none focus:ring-1 focus:ring-purple-400 cursor-pointer"
        >
          <option value="haiku-4.5">Haiku 4.5</option>
          <option value="sonnet-4.5">Sonnet 4.5 ⭐</option>
        </select>

        <button
          onClick={() => setEnableThinking(!enableThinking)}
          className={`px-2 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
            enableThinking
              ? 'bg-purple-600 text-white'
              : 'bg-purple-900/30 text-purple-300 hover:bg-purple-800/30'
          }`}
        >
          <Brain size={12} />
          Thinking
        </button>
      </div>
    )
  }

  // Full version (not used but kept for reference)
  return null
}
