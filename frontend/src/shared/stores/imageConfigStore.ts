import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { UserImageConfig, DEFAULT_CONFIG, CONFIG_PRESETS } from '@/shared/types/imageConfig'

interface ImageConfigState {
  // Current configuration
  config: UserImageConfig

  // Active preset name (if any)
  activePreset: string | null

  // UI state
  isPanelExpanded: boolean

  // Actions
  updateConfig: (updates: Partial<UserImageConfig>) => void
  setConfig: (config: UserImageConfig) => void
  applyPreset: (presetName: string) => void
  resetToDefaults: () => void
  setPanelExpanded: (expanded: boolean) => void

  // Preset management
  saveAsPreset: (name: string, config?: UserImageConfig) => void
  deletePreset: (name: string) => void
  getCustomPresets: () => Record<string, UserImageConfig>
}

interface PersistedState {
  config: UserImageConfig
  activePreset: string | null
  customPresets: Record<string, UserImageConfig>
  isPanelExpanded: boolean
}

const useImageConfigStore = create<ImageConfigState>()(
  persist(
    (set, get) => ({
      // Initial state
      config: DEFAULT_CONFIG,
      activePreset: null,
      isPanelExpanded: false,

      // Update specific config properties
      updateConfig: (updates: Partial<UserImageConfig>) => {
        set((state) => {
          const newConfig = { ...state.config, ...updates }

          // Check if this matches any existing preset
          const matchingPreset = Object.entries({ ...CONFIG_PRESETS, ...get().getCustomPresets() })
            .find(([_, presetConfig]) => {
              return Object.keys(presetConfig).every(
                key => presetConfig[key as keyof UserImageConfig] === newConfig[key as keyof UserImageConfig]
              )
            })

          return {
            config: newConfig,
            activePreset: matchingPreset ? matchingPreset[0] : null
          }
        })
      },

      // Set entire config at once
      setConfig: (config: UserImageConfig) => {
        set({ config, activePreset: null })
      },

      // Apply a named preset
      applyPreset: (presetName: string) => {
        const allPresets = { ...CONFIG_PRESETS, ...get().getCustomPresets() }
        const preset = allPresets[presetName]

        if (preset) {
          const newConfig = { ...get().config, ...preset }
          set({
            config: newConfig,
            activePreset: presetName
          })
        }
      },

      // Reset to default configuration
      resetToDefaults: () => {
        set({
          config: DEFAULT_CONFIG,
          activePreset: null
        })
      },

      // UI state management
      setPanelExpanded: (expanded: boolean) => {
        set({ isPanelExpanded: expanded })
      },

      // Save current config as a custom preset
      saveAsPreset: (name: string, config?: UserImageConfig) => {
        const configToSave = config || get().config

        // Store in localStorage separately from main state
        const existingPresets = JSON.parse(localStorage.getItem('imageConfigCustomPresets') || '{}')
        const updatedPresets = {
          ...existingPresets,
          [name]: configToSave
        }
        localStorage.setItem('imageConfigCustomPresets', JSON.stringify(updatedPresets))

        set({ activePreset: name })
      },

      // Delete a custom preset
      deletePreset: (name: string) => {
        // Remove from localStorage
        const existingPresets = JSON.parse(localStorage.getItem('imageConfigCustomPresets') || '{}')
        delete existingPresets[name]
        localStorage.setItem('imageConfigCustomPresets', JSON.stringify(existingPresets))

        // If this was the active preset, clear it
        if (get().activePreset === name) {
          set({ activePreset: null })
        }
      },

      // Get all custom presets from localStorage
      getCustomPresets: (): Record<string, UserImageConfig> => {
        try {
          return JSON.parse(localStorage.getItem('imageConfigCustomPresets') || '{}')
        } catch {
          return {}
        }
      }
    }),
    {
      name: 'image-config-storage',
      storage: createJSONStorage(() => localStorage),

      // Only persist specific parts of the state
      partialize: (state): PersistedState => ({
        config: state.config,
        activePreset: state.activePreset,
        customPresets: state.getCustomPresets(),
        isPanelExpanded: state.isPanelExpanded
      }),

      // Merge persisted state back
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn('Failed to rehydrate image config store:', error)
        } else if (state) {
          console.log('✅ Image config store rehydrated successfully')
        }
      }
    }
  )
)

// Helper hooks for common operations
export const useImageConfig = () => {
  const store = useImageConfigStore()
  return {
    config: store.config,
    activePreset: store.activePreset,
    updateConfig: store.updateConfig,
    applyPreset: store.applyPreset,
    resetToDefaults: store.resetToDefaults
  }
}

export const useImageConfigUI = () => {
  const store = useImageConfigStore()
  return {
    isPanelExpanded: store.isPanelExpanded,
    setPanelExpanded: store.setPanelExpanded,
    saveAsPreset: store.saveAsPreset,
    deletePreset: store.deletePreset,
    getCustomPresets: store.getCustomPresets
  }
}

// Selector for getting all available presets (built-in + custom)
export const useAllPresets = () => {
  const getCustomPresets = useImageConfigStore(state => state.getCustomPresets)
  return {
    ...CONFIG_PRESETS,
    ...getCustomPresets()
  }
}

export default useImageConfigStore