import { create } from 'zustand'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  reasoning?: string  // Extended Thinking reasoning content (accumulated during streaming)
  isStreaming?: boolean  // Whether this message is currently being streamed
  reasoning_details?: any[]
  tool_used?: string
  model?: string
  final_prompt?: string
  prompt_length?: number
}

interface ChatStore {
  // Chat state
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null

  // Streaming state
  isThinking: boolean
  thinkingStep: string
  thinkingMessage: string
  thinkingElapsed: number

  activeToolName: string | null
  toolProgress: number
  toolStatus: 'idle' | 'running' | 'complete' | 'error'

  // Agent capabilities
  availableTools: string[]

  // Actions
  addMessage: (message: ChatMessage) => void
  updateLastMessage: (content: string) => void
  appendToLastMessage: (messageId: string, chunk: string) => void
  appendReasoningToMessage: (messageId: string, reasoningChunk: string) => void  // NEW: Accumulate reasoning
  updateMessageStreaming: (messageId: string, isStreaming: boolean) => void  // NEW: Update streaming status
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  clearMessages: () => void

  // Streaming methods
  setThinking: (step: string | null, message?: string, elapsed?: number) => void
  updateToolExecution: (toolName: string | null, progress?: number, status?: 'idle' | 'running' | 'complete' | 'error') => void

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

      // Streaming state
      isThinking: false,
      thinkingStep: '',
      thinkingMessage: '',
      thinkingElapsed: 0,
      activeToolName: null,
      toolProgress: 0,
      toolStatus: 'idle',

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

      appendToLastMessage: (messageId, chunk) => set((state) => ({
        messages: state.messages.map(msg =>
          msg.id === messageId
            ? { ...msg, content: msg.content + chunk }
            : msg
        )
      })),

      // NEW: Append reasoning chunk to message (for Extended Thinking)
      appendReasoningToMessage: (messageId, reasoningChunk) => set((state) => ({
        messages: state.messages.map(msg =>
          msg.id === messageId
            ? { ...msg, reasoning: (msg.reasoning || '') + reasoningChunk }
            : msg
        )
      })),

      // NEW: Update streaming status of message
      updateMessageStreaming: (messageId, isStreaming) => set((state) => ({
        messages: state.messages.map(msg =>
          msg.id === messageId
            ? { ...msg, isStreaming }
            : msg
        )
      })),

      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      clearMessages: () => set({
        messages: [],
        error: null
      }),

      // Streaming methods
      setThinking: (step, message = '', elapsed = 0) => set({
        isThinking: !!step,
        thinkingStep: step || '',
        thinkingMessage: message,
        thinkingElapsed: elapsed
      }),

      updateToolExecution: (toolName, progress = 0, status = 'idle') => set({
        activeToolName: toolName,
        toolProgress: progress,
        toolStatus: status
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