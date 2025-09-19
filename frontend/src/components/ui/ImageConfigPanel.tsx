'use client'

import { useState } from 'react'
import { UserImageConfig, DEFAULT_CONFIG, CONFIG_PRESETS, validateUserConfig } from '@/shared/types/imageConfig'
import { ChevronDown, ChevronUp, Settings, Palette, Lightbulb, User, Cog } from 'lucide-react'
import GlassCard from './glass-card'
import { LiquidButton } from './liquid-glass-button'

interface ImageConfigPanelProps {
  config: UserImageConfig
  onConfigChange: (config: UserImageConfig) => void
  className?: string
}

export default function ImageConfigPanel({ config, onConfigChange, className = '' }: ImageConfigPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
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
      {/* Header - Always Visible */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors rounded-lg"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Image Configuration</h3>
          <span className="text-sm text-purple-300 bg-purple-500/20 px-2 py-1 rounded-md">
            {activePreset || 'Custom'}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-purple-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-purple-400" />
        )}
      </div>

      {/* Expanded Configuration Panel */}
      {isExpanded && (
        <GlassCard className="mt-2 p-6 space-y-6">
          {/* Quick Presets */}
          <div>
            <h4 className="text-sm font-medium text-purple-300 mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Quick Presets
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.keys(CONFIG_PRESETS).map((presetName) => (
                <button
                  key={presetName}
                  onClick={() => applyPreset(presetName)}
                  className={`p-2 rounded-lg text-xs transition-all ${
                    activePreset === presetName
                      ? 'bg-purple-600 text-white'
                      : 'bg-white/10 text-purple-200 hover:bg-white/20'
                  }`}
                >
                  {presetName.replace('_', ' ')}
                </button>
              ))}
              <button
                onClick={resetToDefaults}
                className="p-2 rounded-lg text-xs bg-gray-600/20 text-gray-300 hover:bg-gray-600/40 transition-all"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Character Consistency Section */}
          <div>
            <h4 className="text-sm font-medium text-purple-300 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Character Consistency
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-purple-200 mb-2">Consistency Level</label>
                <select
                  value={config.character_consistency}
                  onChange={(e) => updateConfig({ character_consistency: e.target.value as any })}
                  className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                >
                  <option value="strict">Strict - Exact preservation</option>
                  <option value="flexible">Flexible - Core features</option>
                  <option value="creative">Creative - Artistic interpretation</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-purple-200">
                  <input
                    type="checkbox"
                    checked={config.preserve_facial_features}
                    onChange={(e) => updateConfig({ preserve_facial_features: e.target.checked })}
                    className="rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-400"
                  />
                  Preserve Facial Features
                </label>
              </div>

              <div>
                <label className="block text-sm text-purple-200 mb-2">Custom DANI Description</label>
                <textarea
                  value={config.dani_description || ''}
                  onChange={(e) => updateConfig({ dani_description: e.target.value || undefined })}
                  placeholder="Optional: Custom description for DANI character..."
                  className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none resize-none h-20"
                  maxLength={500}
                />
                <p className="text-xs text-purple-300 mt-1">
                  {(config.dani_description || '').length}/500 characters
                </p>
              </div>
            </div>
          </div>

          {/* Visual Style Section */}
          <div>
            <h4 className="text-sm font-medium text-purple-300 mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Visual Style
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-purple-200 mb-2">Style Preset</label>
                <select
                  value={config.style_preset}
                  onChange={(e) => updateConfig({ style_preset: e.target.value as any })}
                  className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                >
                  <option value="photorealistic">Photorealistic</option>
                  <option value="artistic">Artistic</option>
                  <option value="cinematic">Cinematic</option>
                  <option value="portrait">Portrait</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-purple-200 mb-2">Lighting</label>
                <select
                  value={config.lighting_preference}
                  onChange={(e) => updateConfig({ lighting_preference: e.target.value as any })}
                  className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                >
                  <option value="studio">Studio</option>
                  <option value="natural">Natural</option>
                  <option value="dramatic">Dramatic</option>
                  <option value="soft">Soft</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-purple-200 mb-2">Mood</label>
                <select
                  value={config.mood}
                  onChange={(e) => updateConfig({ mood: e.target.value as any })}
                  className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="dynamic">Dynamic</option>
                  <option value="authoritative">Authoritative</option>
                  <option value="friendly">Friendly</option>
                </select>
              </div>
            </div>
          </div>

          {/* Technical Parameters Section */}
          <div>
            <h4 className="text-sm font-medium text-purple-300 mb-3 flex items-center gap-2">
              <Cog className="w-4 h-4" />
              Technical Parameters
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-purple-200 mb-2">
                  Creativity (Temperature): {config.temperature}
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={config.temperature}
                  onChange={(e) => updateConfig({ temperature: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-purple-300 mt-1">
                  <span>Conservative</span>
                  <span>Creative</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-purple-200 mb-2">Seed (Optional)</label>
                <input
                  type="number"
                  value={config.seed || ''}
                  onChange={(e) => updateConfig({ seed: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="Random if empty"
                  className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Generation Preferences */}
          <div>
            <h4 className="text-sm font-medium text-purple-300 mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Generation Preferences
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-purple-200 mb-2">Image Quality</label>
                <select
                  value={config.image_quality}
                  onChange={(e) => updateConfig({ image_quality: e.target.value as any })}
                  className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                >
                  <option value="standard">Standard</option>
                  <option value="high">High</option>
                  <option value="ultra">Ultra</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-purple-200 mb-2">Aspect Ratio</label>
                <select
                  value={config.aspect_ratio}
                  onChange={(e) => updateConfig({ aspect_ratio: e.target.value as any })}
                  className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                >
                  <option value="square">Square (1:1)</option>
                  <option value="landscape">Landscape (16:9)</option>
                  <option value="portrait">Portrait (9:16)</option>
                  <option value="widescreen">Widescreen (21:9)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Current Configuration Summary */}
          <div className="pt-4 border-t border-white/10">
            <p className="text-xs text-purple-300 leading-relaxed">
              <span className="font-medium">Current Config:</span> {config.character_consistency} consistency,
              {config.style_preset} style, {config.lighting_preference} lighting,
              {config.mood} mood, {config.temperature} creativity
            </p>
          </div>
        </GlassCard>
      )}
    </div>
  )
}