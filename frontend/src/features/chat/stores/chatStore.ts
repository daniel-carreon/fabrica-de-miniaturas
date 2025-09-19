import { create } from 'zustand'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  reasoning_details?: any[]
  tool_used?: string
  model?: string
}

interface ChatStore {
  // Chat state
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null

  // Agent capabilities
  availableTools: string[]

  // Actions
  addMessage: (message: ChatMessage) => void
  updateLastMessage: (content: string) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  clearMessages: () => void

  // Tool management
  setAvailableTools: (tools: string[]) => void
  addTool: (tool: string) => void

  // History management
  exportHistory: () => string
  importHistory: (history: string) => void
}

export const useChatStore = create<ChatStore>()((set, get) => ({
      // Initial state
      messages: [],
      isLoading: false,
      error: null,
      availableTools: [],

      // Message management
      addMessage: (message) => set((state) => ({
        messages: [...state.messages, message],
        error: null
      })),

      updateLastMessage: (content) => set((state) => {
        const messages = [...state.messages]
        if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
          messages[messages.length - 1] = {
            ...messages[messages.length - 1],
            content
          }
        }
        return { messages }
      }),

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      clearMessages: () => set({
        messages: [],
        error: null
      }),

      // Tool management
      setAvailableTools: (tools) => set({ availableTools: tools }),

      addTool: (tool) => set((state) => ({
        availableTools: [...state.availableTools, tool]
      })),

      // History management
      exportHistory: () => {
        const { messages } = get()
        return JSON.stringify(messages, null, 2)
      },

      importHistory: (history) => {
        try {
          const messages = JSON.parse(history)
          set({ messages, error: null })
        } catch (error) {
          set({ error: 'Failed to import chat history' })
        }
      }
    }))