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

      // Migration function to handle state structure changes
      migrate: (persistedState: any, version: number) => {
        console.log('🔄 Migrating image config store from version', version)

        // For any version mismatch, return a clean state structure
        if (typeof persistedState === 'object' && persistedState !== null) {
          // Clean config by only keeping valid fields
          const cleanConfig = {
            temperature: persistedState.config?.temperature || DEFAULT_CONFIG.temperature,
            seed: persistedState.config?.seed,
            style_preset: persistedState.config?.style_preset || DEFAULT_CONFIG.style_preset,
            lighting_preference: persistedState.config?.lighting_preference || DEFAULT_CONFIG.lighting_preference,
            mood: persistedState.config?.mood || DEFAULT_CONFIG.mood
          }

          // Remove undefined values
          Object.keys(cleanConfig).forEach(key => {
            if (cleanConfig[key as keyof UserImageConfig] === undefined) {
              delete cleanConfig[key as keyof UserImageConfig]
            }
          })

          console.log('✅ Migrated config - removed obsolete fields (character_consistency, preserve_facial_features)')

          return {
            config: cleanConfig,
            activePreset: persistedState.activePreset || null,
            customPresets: persistedState.customPresets || {},
            isPanelExpanded: persistedState.isPanelExpanded || false
          }
        }

        // If persisted state is invalid, return defaults
        console.log('⚠️ Invalid persisted state, using defaults')
        return {
          config: DEFAULT_CONFIG,
          activePreset: null,
          customPresets: {},
          isPanelExpanded: false
        }
      },

      // Current version for migration tracking (bumped to 2 to force migration)
      version: 2,

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