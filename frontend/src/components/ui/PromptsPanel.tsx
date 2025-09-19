'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Heart, Copy, Edit, Trash2, Tag, X } from 'lucide-react'
import GlassCard from './glass-card'
import { LiquidButton } from './liquid-glass-button'

interface SavedPrompt {
  id: string
  name: string
  prompt: string
  category: 'thumbnail' | 'portrait' | 'background' | 'custom'
  tags: string[]
  is_favorite: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

interface PromptsPanelProps {
  onInjectPrompt: (prompt: string) => void
}

interface CreatePromptData {
  name: string
  prompt: string
  category: 'thumbnail' | 'portrait' | 'background' | 'custom'
  tags: string[]
  is_favorite: boolean
}

export default function PromptsPanel({ onInjectPrompt }: PromptsPanelProps) {
  const [prompts, setPrompts] = useState<SavedPrompt[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showFavorites, setShowFavorites] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createPromptData, setCreatePromptData] = useState<CreatePromptData>({
    name: '',
    prompt: '',
    category: 'custom',
    tags: [],
    is_favorite: false
  })
  const [isCreating, setIsCreating] = useState(false)

  // Load prompts from API
  const loadPrompts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      if (showFavorites) params.append('favorite', 'true')

      const response = await fetch(`/api/prompts?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setPrompts(data.prompts || [])
      }
    } catch (error) {
      console.error('Error loading prompts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPrompts()
  }, [selectedCategory, showFavorites])

  // Filter prompts by search term
  const filteredPrompts = prompts.filter(prompt =>
    prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Handle quick inject
  const handleInjectPrompt = async (prompt: SavedPrompt) => {
    try {
      // Increment usage count
      await fetch(`/api/prompts/${prompt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Empty body triggers usage increment
      })

      // Inject into chat
      onInjectPrompt(prompt.prompt)

      // Show success feedback
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50'
      notification.textContent = `✅ Prompt "${prompt.name}" injected!`
      document.body.appendChild(notification)
      setTimeout(() => notification.remove(), 2000)

      // Reload to update usage count
      loadPrompts()
    } catch (error) {
      console.error('Error injecting prompt:', error)
    }
  }

  // Toggle favorite
  const handleToggleFavorite = async (prompt: SavedPrompt) => {
    try {
      const response = await fetch(`/api/prompts/${prompt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !prompt.is_favorite })
      })

      if (response.ok) {
        loadPrompts()
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  // Delete prompt
  const handleDeletePrompt = async (prompt: SavedPrompt) => {
    if (!confirm(`¿Eliminar prompt "${prompt.name}"?`)) return

    try {
      const response = await fetch(`/api/prompts/${prompt.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadPrompts()
        // Show success notification
        const notification = document.createElement('div')
        notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50'
        notification.textContent = `✅ Prompt "${prompt.name}" eliminado!`
        document.body.appendChild(notification)
        setTimeout(() => notification.remove(), 2000)
      }
    } catch (error) {
      console.error('Error deleting prompt:', error)
      // Show error notification
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50'
      notification.textContent = `❌ Error al eliminar prompt`
      document.body.appendChild(notification)
      setTimeout(() => notification.remove(), 3000)
    }
  }

  // Create new prompt
  const handleCreatePrompt = async () => {
    if (!createPromptData.name || !createPromptData.prompt) {
      alert('Nombre y prompt son requeridos')
      return
    }

    try {
      setIsCreating(true)
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createPromptData)
      })

      if (response.ok) {
        // Reset form
        setCreatePromptData({
          name: '',
          prompt: '',
          category: 'custom',
          tags: [],
          is_favorite: false
        })
        setShowCreateModal(false)
        loadPrompts()

        // Show success notification
        const notification = document.createElement('div')
        notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50'
        notification.textContent = `✅ Prompt "${createPromptData.name}" creado!`
        document.body.appendChild(notification)
        setTimeout(() => notification.remove(), 2000)
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Error al crear prompt')
      }
    } catch (error) {
      console.error('Error creating prompt:', error)
      // Show error notification
      const notification = document.createElement('div')
      notification.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50'
      notification.textContent = `❌ ${error instanceof Error ? error.message : 'Error al crear prompt'}`
      document.body.appendChild(notification)
      setTimeout(() => notification.remove(), 3000)
    } finally {
      setIsCreating(false)
    }
  }

  // Handle tags input
  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
    setCreatePromptData(prev => ({ ...prev, tags }))
  }

  const categories = [
    { key: 'all', label: 'Todos', icon: '📚' },
    { key: 'thumbnail', label: 'Miniaturas', icon: '🖼️' },
    { key: 'portrait', label: 'Retratos', icon: '👤' },
    { key: 'background', label: 'Fondos', icon: '🌄' },
    { key: 'custom', label: 'Personalizados', icon: '⭐' }
  ]

  return (
    <GlassCard variant="dark" className="purple-glow">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            📝 Prompts Guardados ({filteredPrompts.length})
          </h2>
          <LiquidButton
            onClick={() => setShowCreateModal(true)}
            variant="space"
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Crear Prompt
          </LiquidButton>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar prompts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/20 border border-purple-500/30 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.key}
                onClick={() => setSelectedCategory(category.key)}
                className={`px-3 py-1 rounded-full text-sm transition-all ${
                  selectedCategory === category.key
                    ? 'bg-purple-600 text-white'
                    : 'bg-black/20 text-gray-300 hover:bg-purple-500/30'
                }`}
              >
                {category.icon} {category.label}
              </button>
            ))}
            <button
              onClick={() => setShowFavorites(!showFavorites)}
              className={`px-3 py-1 rounded-full text-sm transition-all ${
                showFavorites
                  ? 'bg-red-600 text-white'
                  : 'bg-black/20 text-gray-300 hover:bg-red-500/30'
              }`}
            >
              <Heart className={`w-3 h-3 inline mr-1 ${showFavorites ? 'fill-current' : ''}`} />
              Favoritos
            </button>
          </div>
        </div>

        {/* Prompts List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-400">
              Cargando prompts...
            </div>
          ) : filteredPrompts.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">📝</div>
              <p>No hay prompts guardados</p>
              <p className="text-sm">¡Crea tu primer prompt!</p>
            </div>
          ) : (
            filteredPrompts.map((prompt) => (
              <div
                key={prompt.id}
                className="bg-black/30 border border-purple-500/20 rounded-lg p-4 hover:border-purple-400/40 transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-white truncate">
                        {prompt.name}
                      </h3>
                      <span className="px-2 py-1 text-xs bg-purple-600/30 text-purple-200 rounded-full">
                        {categories.find(c => c.key === prompt.category)?.icon} {prompt.category}
                      </span>
                      {prompt.is_favorite && (
                        <Heart className="w-4 h-4 text-red-500 fill-current" />
                      )}
                    </div>
                    <p className="text-gray-300 text-sm line-clamp-2 mb-2">
                      {prompt.prompt}
                    </p>
                    {prompt.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {prompt.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 flex items-center gap-4">
                      <span>💫 Usado {prompt.usage_count} veces</span>
                      <span>{new Date(prompt.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleInjectPrompt(prompt)}
                      className="w-8 h-8 bg-green-600 hover:bg-green-700 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                      title="Inyectar en chat"
                    >
                      <Copy className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={() => handleToggleFavorite(prompt)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 ${
                        prompt.is_favorite
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-gray-600 hover:bg-red-600'
                      }`}
                      title="Toggle favorito"
                    >
                      <Heart className={`w-4 h-4 text-white ${prompt.is_favorite ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleDeletePrompt(prompt)}
                      className="w-8 h-8 bg-red-600 hover:bg-red-700 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                      title="Eliminar prompt"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Actions */}
        {filteredPrompts.length > 0 && (
          <div className="pt-4 border-t border-purple-500/20">
            <div className="flex gap-2 text-sm text-gray-400">
              <span>💡 Tip:</span>
              <span>Click en ✅ para inyectar prompt al chat</span>
            </div>
          </div>
        )}
      </div>

      {/* Create Prompt Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-purple-500/30 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">✨ Crear Nuevo Prompt</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 bg-red-600 hover:bg-red-700 rounded-lg flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-purple-300 text-sm font-medium mb-2">Nombre del Prompt</label>
                <input
                  type="text"
                  value={createPromptData.name}
                  onChange={(e) => setCreatePromptData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: DANI Excited Reaction"
                  className="w-full bg-black/30 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-purple-300 text-sm font-medium mb-2">Categoría</label>
                <select
                  value={createPromptData.category}
                  onChange={(e) => setCreatePromptData(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full bg-black/30 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-400"
                >
                  <option value="thumbnail">🖼️ Miniaturas</option>
                  <option value="portrait">👤 Retratos</option>
                  <option value="background">🌄 Fondos</option>
                  <option value="custom">⭐ Personalizado</option>
                </select>
              </div>

              {/* Prompt */}
              <div>
                <label className="block text-purple-300 text-sm font-medium mb-2">Prompt</label>
                <textarea
                  value={createPromptData.prompt}
                  onChange={(e) => setCreatePromptData(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder="DANI excited surprised expression, wide eyes, pointing gesture, dynamic pose, bright colorful background, perfect for reaction thumbnail, energetic mood"
                  rows={5}
                  className="w-full bg-black/30 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400 resize-none"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-purple-300 text-sm font-medium mb-2">Tags (separados por comas)</label>
                <input
                  type="text"
                  value={createPromptData.tags.join(', ')}
                  onChange={(e) => handleTagsChange(e.target.value)}
                  placeholder="excited, reaction, dynamic, colorful"
                  className="w-full bg-black/30 border border-purple-500/30 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                />
              </div>

              {/* Favorite checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is-favorite"
                  checked={createPromptData.is_favorite}
                  onChange={(e) => setCreatePromptData(prev => ({ ...prev, is_favorite: e.target.checked }))}
                  className="w-4 h-4 text-purple-600 border-purple-500/30 rounded focus:ring-purple-500"
                />
                <label htmlFor="is-favorite" className="text-white text-sm">
                  ❤️ Marcar como favorito
                </label>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-4">
                <LiquidButton
                  onClick={() => setShowCreateModal(false)}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancelar
                </LiquidButton>
                <LiquidButton
                  onClick={handleCreatePrompt}
                  disabled={isCreating || !createPromptData.name || !createPromptData.prompt}
                  variant="space"
                  className="flex-1 disabled:opacity-50"
                >
                  {isCreating ? '⏳ Creando...' : '✨ Crear Prompt'}
                </LiquidButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </GlassCard>
  )
}