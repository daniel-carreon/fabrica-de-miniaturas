'use client'

import { create } from 'zustand'

export interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
  is_favorite: boolean
  metadata?: Record<string, unknown>
}

export interface ConversationMessage {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tool_used?: string
  tool_result?: Record<string, unknown>
  created_at: string
}

interface ConversationStore {
  // State
  conversations: Conversation[]
  currentConversationId: string | null
  currentMessages: ConversationMessage[]
  loading: boolean
  error: string | null

  // Actions
  loadConversations: () => Promise<void>
  createConversation: (title?: string) => Promise<Conversation>
  setCurrentConversation: (id: string) => Promise<void>
  loadConversationMessages: (id: string) => Promise<void>
  addMessage: (message: ConversationMessage) => void
  updateConversationTitle: (id: string, title: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  clearError: () => void
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8001'

export const useConversationStore = create<ConversationStore>((set, get) => ({
  // Initial state
  conversations: [],
  currentConversationId: null,
  currentMessages: [],
  loading: false,
  error: null,

  // Load all conversations
  loadConversations: async () => {
    set({ loading: true, error: null })
    try {
      const response = await fetch(`${BACKEND_URL}/api/conversations`)
      if (!response.ok) throw new Error(`Failed to load conversations: ${response.status}`)
      const data = await response.json()
      set({ conversations: data.conversations || [], loading: false })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ Error loading conversations:', errorMsg)
      set({ error: errorMsg, loading: false })
    }
  },

  // Create new conversation
  createConversation: async (title = 'Nueva Conversación') => {
    set({ error: null })
    try {
      const response = await fetch(`${BACKEND_URL}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      })
      if (!response.ok) throw new Error(`Failed to create conversation`)
      const conversation = await response.json()
      set((state) => ({
        conversations: [conversation, ...state.conversations],
        currentConversationId: conversation.id,
        currentMessages: []
      }))
      return conversation
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ Error creating conversation:', errorMsg)
      set({ error: errorMsg })
      throw error
    }
  },

  // Load conversation messages
  loadConversationMessages: async (id: string) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch(`${BACKEND_URL}/api/conversations/${id}/messages`)
      if (!response.ok) throw new Error(`Failed to load messages`)
      const data = await response.json()
      set({
        currentConversationId: id,
        currentMessages: data.messages || [],
        loading: false
      })
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ Error loading messages:', errorMsg)
      set({ error: errorMsg, loading: false })
    }
  },

  // Set current conversation
  setCurrentConversation: async (id: string) => {
    const store = get()
    await store.loadConversationMessages(id)
  },

  // Add message locally (for real-time UI updates)
  addMessage: (message: ConversationMessage) => {
    set((state) => ({
      currentMessages: [...state.currentMessages, message]
    }))
  },

  // Update conversation title
  updateConversationTitle: async (id: string, title: string) => {
    set({ error: null })
    try {
      const response = await fetch(`${BACKEND_URL}/api/conversations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      })
      if (!response.ok) throw new Error('Failed to update conversation')

      set((state) => ({
        conversations: state.conversations.map((conv) =>
          conv.id === id ? { ...conv, title } : conv
        )
      }))
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ Error updating conversation:', errorMsg)
      set({ error: errorMsg })
      throw error
    }
  },

  // Delete conversation
  deleteConversation: async (id: string) => {
    set({ error: null })
    try {
      const response = await fetch(`${BACKEND_URL}/api/conversations/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete conversation')

      set((state) => ({
        conversations: state.conversations.filter((conv) => conv.id !== id),
        currentConversationId: state.currentConversationId === id ? null : state.currentConversationId,
        currentMessages: state.currentConversationId === id ? [] : state.currentMessages
      }))
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ Error deleting conversation:', errorMsg)
      set({ error: errorMsg })
      throw error
    }
  },

  // Toggle favorite
  toggleFavorite: async (id: string) => {
    set({ error: null })
    const state = get()
    const conversation = state.conversations.find((c) => c.id === id)
    if (!conversation) return

    try {
      const response = await fetch(`${BACKEND_URL}/api/conversations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_favorite: !conversation.is_favorite })
      })
      if (!response.ok) throw new Error('Failed to toggle favorite')

      set((state) => ({
        conversations: state.conversations.map((conv) =>
          conv.id === id
            ? { ...conv, is_favorite: !conv.is_favorite }
            : conv
        )
      }))
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ Error toggling favorite:', errorMsg)
      set({ error: errorMsg })
      throw error
    }
  },

  // Clear error
  clearError: () => set({ error: null })
}))
