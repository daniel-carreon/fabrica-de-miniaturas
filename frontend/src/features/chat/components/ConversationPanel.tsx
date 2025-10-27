'use client'

import React, { useEffect, useState } from 'react'
import { useConversationStore } from '@/shared/stores/conversationStore'
import { Trash2, Star, Plus, Menu, X } from 'lucide-react'

export function ConversationPanel() {
  const {
    conversations,
    currentConversationId,
    loading,
    error,
    loadConversations,
    createConversation,
    setCurrentConversation,
    deleteConversation,
    toggleFavorite,
    clearError
  } = useConversationStore()

  const [isOpen, setIsOpen] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  useEffect(() => {
    loadConversations()
  }, [])

  const handleNewConversation = async () => {
    try {
      await createConversation()
      setIsOpen(true)
    } catch (e) {
      console.error('Failed to create conversation')
    }
  }

  const handleSelectConversation = async (id: string) => {
    try {
      await setCurrentConversation(id)
    } catch (e) {
      console.error('Failed to select conversation')
    }
  }

  const handleStartEdit = (id: string, currentTitle: string) => {
    setEditingId(id)
    setEditTitle(currentTitle)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditTitle('')
  }

  const handleSaveTitle = async (id: string) => {
    if (editTitle.trim()) {
      try {
        // Update via store - but we need to implement this
        // For now, just update locally
        handleCancelEdit()
      } catch (e) {
        console.error('Failed to update title')
      }
    }
  }

  // Favorites first, then recent
  const sortedConversations = [...conversations].sort((a, b) => {
    if (a.is_favorite !== b.is_favorite) {
      return a.is_favorite ? -1 : 1
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg lg:hidden bg-gray-800 text-white hover:bg-gray-700"
        aria-label="Toggle sidebar"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-gray-900 text-white flex flex-col z-40 transition-transform duration-300 ease-in-out transform lg:relative lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex-shrink-0">
          <button
            onClick={handleNewConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition font-medium"
          >
            <Plus className="w-5 h-5" />
            Nueva Conversación
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-2 mt-2 p-2 bg-red-900/30 border border-red-700 rounded text-sm text-red-200 flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={clearError}
              className="text-red-300 hover:text-red-200"
            >
              ×
            </button>
          </div>
        )}

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center text-gray-400 py-8">
              <div className="animate-spin inline-block w-4 h-4 border-2 border-gray-600 border-t-blue-500 rounded-full" />
              <p className="mt-2 text-sm">Cargando...</p>
            </div>
          ) : sortedConversations.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p className="text-sm">Sin conversaciones aún</p>
              <p className="text-xs mt-2">Crea una nueva para empezar</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sortedConversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group p-3 rounded-lg transition cursor-pointer ${
                    currentConversationId === conv.id
                      ? 'bg-blue-600 shadow-lg'
                      : 'hover:bg-gray-800 bg-gray-800/50'
                  }`}
                >
                  {editingId === conv.id ? (
                    // Edit mode
                    <input
                      autoFocus
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => handleSaveTitle(conv.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTitle(conv.id)
                        if (e.key === 'Escape') handleCancelEdit()
                      }}
                      className="w-full bg-gray-700 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  ) : (
                    // View mode
                    <div
                      onClick={() => handleSelectConversation(conv.id)}
                      className="space-y-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate hover:underline">
                            {conv.title}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(conv.created_at).toLocaleDateString('es-ES', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        {conv.is_favorite && (
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                        )}
                      </div>

                      {/* Action Buttons - Only show on hover */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition pt-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStartEdit(conv.id, conv.title)
                          }}
                          className="flex-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition"
                          title="Editar título"
                        >
                          Editar
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite(conv.id)
                          }}
                          className="p-1 hover:bg-yellow-600/30 rounded transition"
                          title="Marcar como favorito"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              conv.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'
                            }`}
                          />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('¿Eliminar esta conversación?')) {
                              deleteConversation(conv.id)
                            }
                          }}
                          className="p-1 hover:bg-red-600/30 rounded transition"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer - Stats */}
        <div className="p-4 border-t border-gray-700 text-xs text-gray-400 flex-shrink-0">
          <p>{conversations.length} conversaciones</p>
          <p>{conversations.filter((c) => c.is_favorite).length} favoritas</p>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
