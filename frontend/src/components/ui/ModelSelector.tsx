'use client'

import { useModelStore } from '@/shared/stores/modelStore'
import GlassCard from './glass-card'
import { Brain } from 'lucide-react'

export default function ModelSelector() {
  const { selectedModel, setSelectedModel, enableThinking, setEnableThinking } = useModelStore()

  return (
    <GlassCard variant="dark" className="purple-glow">
      <div className="flex flex-col gap-3">
        {/* Model Selection */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-purple-200">🧠 Model:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedModel('haiku-4.5')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedModel === 'haiku-4.5'
                  ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                  : 'bg-purple-900/30 text-purple-300 hover:bg-purple-800/30'
              }`}
            >
              Haiku 4.5 (Fast)
            </button>
            <button
              onClick={() => setSelectedModel('sonnet-4.5')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedModel === 'sonnet-4.5'
                  ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                  : 'bg-purple-900/30 text-purple-300 hover:bg-purple-800/30'
              }`}
            >
              Sonnet 4.5 ⭐
            </button>
          </div>
        </div>

        {/* Extended Thinking Toggle */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-purple-200">💭 Thinking:</span>
          <button
            onClick={() => setEnableThinking(!enableThinking)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              enableThinking
                ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                : 'bg-purple-900/30 text-purple-300 hover:bg-purple-800/30'
            }`}
          >
            <Brain size={14} />
            {enableThinking ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>
    </GlassCard>
  )
}
