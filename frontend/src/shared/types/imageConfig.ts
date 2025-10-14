/**
 * Simplified User Configuration Types for Image Generation
 * Pareto 80/20 Approach - Only parameters that actually work
 */

export type StylePreset = 'photorealistic' | 'artistic' | 'cinematic' | 'portrait'
export type LightingPreference = 'studio' | 'natural' | 'dramatic' | 'soft'
export type Mood = 'professional' | 'casual' | 'dynamic' | 'authoritative' | 'friendly'

export interface UserImageConfig {
  // TIER 1: Critical Parameters (directly used by Nano Banana API)
  temperature: number // 0.1 to 1.0
  seed?: number

  // TIER 2: Advanced Parameters (only affect prompt enhancement)
  style_preset?: StylePreset
  lighting_preference?: LightingPreference
  mood?: Mood
}

export const DEFAULT_CONFIG: UserImageConfig = {
  // Essential
  temperature: 0.3,

  // Advanced defaults (optional)
  style_preset: 'photorealistic',
  lighting_preference: 'studio',
  mood: 'professional'
}

// Simplified presets for common use cases
export const CONFIG_PRESETS: Record<string, Partial<UserImageConfig>> = {
  youtube_thumbnail: {
    temperature: 0.3,
    style_preset: 'cinematic',
    lighting_preference: 'dramatic',
    mood: 'dynamic'
  },

  professional_portrait: {
    temperature: 0.2,
    style_preset: 'photorealistic',
    lighting_preference: 'studio',
    mood: 'professional'
  },

  creative_art: {
    temperature: 0.7,
    style_preset: 'artistic',
    lighting_preference: 'dramatic',
    mood: 'dynamic'
  },

  social_media: {
    temperature: 0.4,
    style_preset: 'portrait',
    lighting_preference: 'soft',
    mood: 'friendly'
  }
}

// Validation helpers
export const isValidTemperature = (temp: number): boolean => {
  return temp >= 0.1 && temp <= 1.0
}

export const validateUserConfig = (config: Partial<UserImageConfig>): string[] => {
  const errors: string[] = []

  if (config.temperature !== undefined && !isValidTemperature(config.temperature)) {
    errors.push('Temperature must be between 0.1 and 1.0')
  }

  return errors
}
