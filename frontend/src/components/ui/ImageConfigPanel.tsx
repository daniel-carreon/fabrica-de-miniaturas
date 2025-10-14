'use client'

import { useState } from 'react'
import { UserImageConfig, DEFAULT_CONFIG, CONFIG_PRESETS, validateUserConfig } from '@/shared/types/imageConfig'
import { Settings, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import GlassCard from './glass-card'

interface ImageConfigPanelProps {
  config: UserImageConfig
  onConfigChange: (config: UserImageConfig) => void
  className?: string
}

export default function ImageConfigPanel({ config, onConfigChange, className = '' }: ImageConfigPanelProps) {
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const updateConfig = (updates: Partial<UserImageConfig>) => {
    const newConfig = { ...config, ...updates }

    // Validate before applying
    const errors = validateUserConfig(newConfig)
    if (errors.length === 0) {
      onConfigChange(newConfig)
      setActivePreset(null) // Reset preset when manually changing
    } else {
      console.warn('Config validation errors:', errors)
    }
  }

  const applyPreset = (presetName: string) => {
    const preset = CONFIG_PRESETS[presetName]
    if (preset) {
      const newConfig = { ...config, ...preset }
      onConfigChange(newConfig)
      setActivePreset(presetName)
    }
  }

  const resetToDefaults = () => {
    onConfigChange(DEFAULT_CONFIG)
    setActivePreset(null)
  }

  // Calculate creativity percentage for display
  const creativityPercentage = Math.round((config.temperature - 0.1) / 0.9 * 100)

  return (
    <div className={`w-full ${className}`}>
      <GlassCard className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Configuración</h3>
          </div>
          <span className="text-sm text-purple-300 bg-purple-500/20 px-3 py-1 rounded-md self-start sm:self-center">
            {activePreset === 'youtube_thumbnail' ? '📺 YouTube' :
             activePreset === 'professional_portrait' ? '👔 Profesional' :
             activePreset === 'creative_art' ? '🎨 Arte Creativo' :
             activePreset === 'social_media' ? '📱 Redes Sociales' :
             '⚙️ Personalizado'}
          </span>
        </div>

        {/* MODO SIMPLE - Siempre visible */}
        <div className="space-y-4">
          {/* Presets Rápidos */}
          <div>
            <h4 className="text-sm font-medium text-purple-300 mb-3">🎨 Estilos Rápidos</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => applyPreset('youtube_thumbnail')}
                className={`p-3 rounded-lg text-sm transition-all ${
                  activePreset === 'youtube_thumbnail'
                    ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                    : 'bg-white/10 text-purple-200 hover:bg-white/20'
                }`}
              >
                📺 YouTube
              </button>
              <button
                onClick={() => applyPreset('professional_portrait')}
                className={`p-3 rounded-lg text-sm transition-all ${
                  activePreset === 'professional_portrait'
                    ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                    : 'bg-white/10 text-purple-200 hover:bg-white/20'
                }`}
              >
                👔 Profesional
              </button>
              <button
                onClick={() => applyPreset('creative_art')}
                className={`p-3 rounded-lg text-sm transition-all ${
                  activePreset === 'creative_art'
                    ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                    : 'bg-white/10 text-purple-200 hover:bg-white/20'
                }`}
              >
                🎨 Artístico
              </button>
              <button
                onClick={resetToDefaults}
                className="p-3 rounded-lg text-sm bg-gray-600/20 text-gray-300 hover:bg-gray-600/40 transition-all"
              >
                ↺ Reiniciar
              </button>
            </div>
          </div>

          {/* Creativity Slider - Principal Control */}
          <div>
            <label className="block text-sm font-medium text-purple-300 mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Creatividad: {creativityPercentage}%
            </label>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={config.temperature}
              onChange={(e) => updateConfig({ temperature: parseFloat(e.target.value) })}
              className="w-full h-3 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-purple-300 mt-1">
              <span>🎯 Preciso</span>
              <span className="text-purple-200 font-medium">←  Ideal para miniaturas  →</span>
              <span>🎨 Creativo</span>
            </div>
          </div>
        </div>

        {/* Toggle Advanced Mode */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/10"
        >
          <span className="text-sm font-medium text-purple-200">
            ⚙️ Modo Avanzado
          </span>
          {showAdvanced ? (
            <ChevronUp className="w-4 h-4 text-purple-300" />
          ) : (
            <ChevronDown className="w-4 h-4 text-purple-300" />
          )}
        </button>

        {/* MODO AVANZADO - Colapsable */}
        {showAdvanced && (
          <div className="space-y-4 pt-2 border-t border-white/10 animate-in slide-in-from-top-2 duration-200">
            <p className="text-xs text-purple-300/70">
              ⚠️ Estos parámetros solo afectan el prompt, no el modelo directamente
            </p>

            {/* Style Preset */}
            <div>
              <label className="block text-sm text-purple-200 mb-2">Tipo de Imagen</label>
              <select
                value={config.style_preset || 'photorealistic'}
                onChange={(e) => updateConfig({ style_preset: e.target.value as any })}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none text-sm"
              >
                <option value="photorealistic">📸 Foto Realista</option>
                <option value="artistic">🎨 Artístico</option>
                <option value="cinematic">🎬 Cinematográfico</option>
                <option value="portrait">👤 Retrato</option>
              </select>
            </div>

            {/* Lighting */}
            <div>
              <label className="block text-sm text-purple-200 mb-2">Iluminación</label>
              <select
                value={config.lighting_preference || 'studio'}
                onChange={(e) => updateConfig({ lighting_preference: e.target.value as any })}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none text-sm"
              >
                <option value="studio">💡 Estudio</option>
                <option value="natural">☀️ Natural</option>
                <option value="dramatic">🔥 Dramática</option>
                <option value="soft">✨ Suave</option>
              </select>
            </div>

            {/* Mood */}
            <div>
              <label className="block text-sm text-purple-200 mb-2">Ambiente</label>
              <select
                value={config.mood || 'professional'}
                onChange={(e) => updateConfig({ mood: e.target.value as any })}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none text-sm"
              >
                <option value="professional">💼 Profesional</option>
                <option value="casual">😊 Casual</option>
                <option value="dynamic">⚡ Dinámico</option>
                <option value="authoritative">👔 Autoritativo</option>
                <option value="friendly">🤝 Amigable</option>
              </select>
            </div>

            {/* Seed (Optional) */}
            <div>
              <label className="block text-sm text-purple-200 mb-2">
                Código Fijo (Opcional)
              </label>
              <input
                type="number"
                value={config.seed || ''}
                onChange={(e) => updateConfig({ seed: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="Aleatorio si está vacío"
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none text-sm"
              />
              <p className="text-xs text-purple-300 mt-1">
                Para obtener resultados reproducibles (mismo código = misma imagen)
              </p>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="pt-4 border-t border-white/10">
          <p className="text-xs text-purple-300 leading-relaxed bg-purple-500/5 p-3 rounded-lg">
            <span className="font-medium">💡 Tip:</span> {' '}
            {config.temperature < 0.4
              ? 'Creatividad baja - Ideal para miniaturas consistentes y profesionales'
              : config.temperature > 0.6
              ? 'Creatividad alta - Perfecto para arte experimental y variaciones únicas'
              : 'Creatividad media - Balance entre consistencia y variedad'}
          </p>
        </div>
      </GlassCard>
    </div>
  )
}
