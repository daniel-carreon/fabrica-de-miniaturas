'use client'

import { create } from 'zustand'

interface ModelStore {
  selectedModel: 'haiku-4.5' | 'sonnet-4.5'
  enableThinking: boolean
  setSelectedModel: (model: 'haiku-4.5' | 'sonnet-4.5') => void
  setEnableThinking: (enabled: boolean) => void
}

export const useModelStore = create<ModelStore>((set) => ({
  selectedModel: 'haiku-4.5', // Default to Haiku for speed + cost
  enableThinking: true, // Default thinking enabled
  setSelectedModel: (model) => set({ selectedModel: model }),
  setEnableThinking: (enabled) => set({ enableThinking: enabled }),
}))

export const getModelName = (model: 'haiku-4.5' | 'sonnet-4.5'): string => {
  switch (model) {
    case 'haiku-4.5':
      return 'anthropic/claude-haiku-4.5'
    case 'sonnet-4.5':
      return 'anthropic/claude-sonnet-4.5'
  }
}
