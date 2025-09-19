/**
 * User Configuration Types for Image Generation
 * Mirrors the backend UserImageConfig model for type safety
 */

export type CharacterConsistency = 'strict' | 'flexible' | 'creative'
export type StylePreset = 'photorealistic' | 'artistic' | 'cinematic' | 'portrait'
export type LightingPreference = 'studio' | 'natural' | 'dramatic' | 'soft'
export type Mood = 'professional' | 'casual' | 'dynamic' | 'authoritative' | 'friendly'
export type ImageQuality = 'standard' | 'high' | 'ultra'
export type AspectRatio = 'square' | 'landscape' | 'portrait' | 'widescreen'

export interface UserImageConfig {
  // Character Consistency Settings
  character_consistency: CharacterConsistency
  dani_description?: string
  preserve_facial_features: boolean

  // Visual Style Settings
  style_preset: StylePreset
  lighting_preference: LightingPreference
  mood: Mood

  // Technical Parameters
  temperature: number // 0.1 to 1.0
  seed?: number

  // Generation Preferences
  image_quality: ImageQuality
  aspect_ratio: AspectRatio
}

export interface UserImageConfigDefaults {
  character_consistency: 'flexible'
  preserve_facial_features: true
  style_preset: 'photorealistic'
  lighting_preference: 'studio'
  mood: 'professional'
  temperature: 0.3
  image_quality: 'high'
  aspect_ratio: 'landscape'
}

export const DEFAULT_CONFIG: UserImageConfig = {
  character_consistency: 'flexible',
  preserve_facial_features: true,
  style_preset: 'photorealistic',
  lighting_preference: 'studio',
  mood: 'professional',
  temperature: 0.3,
  image_quality: 'high',
  aspect_ratio: 'landscape'
}

// Configuration presets for common use cases
export const CONFIG_PRESETS: Record<string, Partial<UserImageConfig>> = {
  dani_professional: {
    character_consistency: 'strict',
    style_preset: 'photorealistic',
    lighting_preference: 'studio',
    mood: 'professional',
    temperature: 0.2,
    preserve_facial_features: true
  },

  dani_creative: {
    character_consistency: 'creative',
    style_preset: 'artistic',
    lighting_preference: 'dramatic',
    mood: 'dynamic',
    temperature: 0.7,
    preserve_facial_features: false
  },

  thumbnail_optimized: {
    character_consistency: 'flexible',
    style_preset: 'cinematic',
    lighting_preference: 'dramatic',
    mood: 'authoritative',
    temperature: 0.4,
    aspect_ratio: 'landscape'
  },

  portrait_mode: {
    character_consistency: 'strict',
    style_preset: 'portrait',
    lighting_preference: 'soft',
    mood: 'friendly',
    temperature: 0.3,
    aspect_ratio: 'portrait'
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

  if (config.dani_description && config.dani_description.length > 500) {
    errors.push('DANI description must be under 500 characters')
  }

  return errors
}