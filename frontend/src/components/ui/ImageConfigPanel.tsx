'use client'

import { useState } from 'react'
import { UserImageConfig, DEFAULT_CONFIG, CONFIG_PRESETS, validateUserConfig } from '@/shared/types/imageConfig'
import { Settings, Palette, Lightbulb, User, Cog } from 'lucide-react'
import GlassCard from './glass-card'

interface ImageConfigPanelProps {
  config: UserImageConfig
  onConfigChange: (config: UserImageConfig) => void
  className?: string
}

export default function ImageConfigPanel({ config, onConfigChange, className = '' }: ImageConfigPanelProps) {
  const [activePreset, setActivePreset] = useState<string | null>(null)

  const updateConfig = (updates: Partial<UserImageConfig>) => {
    const newConfig = { ...config, ...updates }

    // Validate before applying
    const errors = validateUserConfig(newConfig)
    if (errors.length === 0) {
      onConfigChange(newConfig)
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

  return (
    <div className={`w-full ${className}`}>
      {/* Panel Principal - Siempre Visible, con Scroll */}
      <GlassCard className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto mobile-scroll space-y-4 sm:space-y-6 config-panel-mobile">
        {/* Título y Estado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Configuración de Imágenes</h3>
          </div>
          <span className="text-sm text-purple-300 bg-purple-500/20 px-3 py-1 rounded-md self-start sm:self-center">
            {activePreset === 'youtube_thumbnail' ? 'Miniatura YouTube' :
             activePreset === 'professional_portrait' ? 'Retrato Profesional' :
             activePreset === 'creative_art' ? 'Arte Creativo' :
             activePreset === 'social_media' ? 'Redes Sociales' :
             activePreset || 'Personalizado'}
          </span>
        </div>

        {/* Estilos Rápidos */}
        <div>
          <h4 className="text-sm font-medium text-purple-300 mb-3 flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Estilos Rápidos
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => applyPreset('youtube_thumbnail')}
              className={`p-3 rounded-lg text-sm transition-all ${
                activePreset === 'youtube_thumbnail'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-purple-200 hover:bg-white/20'
              }`}
            >
              📺 YouTube
            </button>
            <button
              onClick={() => applyPreset('professional_portrait')}
              className={`p-3 rounded-lg text-sm transition-all ${
                activePreset === 'professional_portrait'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-purple-200 hover:bg-white/20'
              }`}
            >
              👔 Profesional
            </button>
            <button
              onClick={() => applyPreset('creative_art')}
              className={`p-3 rounded-lg text-sm transition-all ${
                activePreset === 'creative_art'
                  ? 'bg-purple-600 text-white'
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

        {/* Personaje DANI */}
        <div>
          <h4 className="text-sm font-medium text-purple-300 mb-3 flex items-center gap-2">
            <User className="w-4 h-4" />
            Personalización DANI
          </h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-purple-200 mb-2">Nivel de Similitud</label>
              <select
                value={config.character_consistency}
                onChange={(e) => updateConfig({ character_consistency: e.target.value as any })}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none text-sm"
              >
                <option value="strict">🎯 Exacto - Conservar todo</option>
                <option value="flexible">⚖️ Flexible - Rasgos principales</option>
                <option value="creative">🎨 Creativo - Interpretación artística</option>
              </select>
            </div>

            <div>
              <label className="flex items-start gap-3 text-sm text-purple-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.preserve_facial_features}
                  onChange={(e) => updateConfig({ preserve_facial_features: e.target.checked })}
                  className="rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-400 mt-0.5"
                />
                <span>Mantener rasgos faciales idénticos</span>
              </label>
            </div>

            <div>
              <label className="block text-sm text-purple-200 mb-2">Descripción Personalizada (Opcional)</label>
              <textarea
                value={config.dani_description || ''}
                onChange={(e) => updateConfig({ dani_description: e.target.value || undefined })}
                placeholder="Ej: con gafas, sonriendo, barba corta..."
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none resize-none h-20 text-sm"
                maxLength={200}
              />
              <p className="text-xs text-purple-300 mt-1">
                {(config.dani_description || '').length}/200 caracteres
              </p>
            </div>
          </div>
        </div>

        {/* Estilo Visual */}
        <div>
          <h4 className="text-sm font-medium text-purple-300 mb-3 flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Estilo Visual
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-purple-200 mb-2">Tipo de Imagen</label>
              <select
                value={config.style_preset}
                onChange={(e) => updateConfig({ style_preset: e.target.value as any })}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none text-sm"
              >
                <option value="photorealistic">📸 Foto Realista</option>
                <option value="artistic">🎨 Artístico</option>
                <option value="cinematic">🎬 Cinematográfico</option>
                <option value="portrait">👤 Retrato</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-purple-200 mb-2">Iluminación</label>
              <select
                value={config.lighting_preference}
                onChange={(e) => updateConfig({ lighting_preference: e.target.value as any })}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none text-sm"
              >
                <option value="studio">💡 Estudio</option>
                <option value="natural">☀️ Natural</option>
                <option value="dramatic">🔥 Dramática</option>
                <option value="soft">✨ Suave</option>
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-sm text-purple-200 mb-2">Ambiente</label>
              <select
                value={config.mood}
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
          </div>
        </div>

        {/* Configuración Avanzada */}
        <div>
          <h4 className="text-sm font-medium text-purple-300 mb-3 flex items-center gap-2">
            <Cog className="w-4 h-4" />
            Configuración Avanzada
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-purple-200 mb-2">
                Creatividad: {config.temperature}
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
                <span>🎨 Creativo</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-purple-200 mb-2">Código Fijo (Opcional)</label>
              <input
                type="number"
                value={config.seed || ''}
                onChange={(e) => updateConfig({ seed: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="Aleatorio si está vacío"
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none text-sm"
              />
              <p className="text-xs text-purple-300 mt-1">Para resultados reproducibles</p>
            </div>
          </div>
        </div>

        {/* Preferencias de Imagen */}
        <div>
          <h4 className="text-sm font-medium text-purple-300 mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Formato de Imagen
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-purple-200 mb-2">Calidad</label>
              <select
                value={config.image_quality}
                onChange={(e) => updateConfig({ image_quality: e.target.value as any })}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none text-sm"
              >
                <option value="standard">📱 Estándar</option>
                <option value="high">💎 Alta</option>
                <option value="ultra">🚀 Ultra</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-purple-200 mb-2">Proporción</label>
              <select
                value={config.aspect_ratio}
                onChange={(e) => updateConfig({ aspect_ratio: e.target.value as any })}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none text-sm"
              >
                <option value="square">⬜ Cuadrada (1:1)</option>
                <option value="landscape">📺 Horizontal (16:9)</option>
                <option value="portrait">📱 Vertical (9:16)</option>
                <option value="widescreen">🎬 Panorámica (21:9)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Resumen de Configuración */}
        <div className="pt-4 border-t border-white/10">
          <p className="text-xs text-purple-300 leading-relaxed bg-purple-500/5 p-3 rounded-lg">
            <span className="font-medium">📋 Configuración actual:</span> {' '}
            {config.character_consistency === 'strict' ? 'similitud exacta' :
             config.character_consistency === 'flexible' ? 'similitud flexible' : 'interpretación creativa'}, {' '}
            estilo {config.style_preset === 'photorealistic' ? 'foto realista' :
                    config.style_preset === 'artistic' ? 'artístico' :
                    config.style_preset === 'cinematic' ? 'cinematográfico' : 'retrato'}, {' '}
            iluminación {config.lighting_preference === 'studio' ? 'de estudio' :
                        config.lighting_preference === 'natural' ? 'natural' :
                        config.lighting_preference === 'dramatic' ? 'dramática' : 'suave'}
          </p>
        </div>
      </GlassCard>
    </div>
  )
}