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

// Agent Phase State Machine - Tracks current execution phase
export type AgentPhase =
  | { type: 'idle' }
  | { type: 'thinking', step: string, message: string, elapsed: number }
  | { type: 'executing_tool', toolName: string, toolId: string, progress: number, status: 'starting' | 'running' | 'complete' | 'error' }
  | { type: 'responding', textAccumulated: string }

interface ChatStore {
  // Chat state
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null

  // Model selection
  selectedModel: 'sonnet' | 'haiku'

  // Agent Phase State Machine (NEW)
  agentPhase: AgentPhase

  // Streaming state (legacy - kept for backward compatibility)
  isThinking: boolean
  thinkingStep: string
  thinkingMessage: string
  thinkingElapsed: number

  activeToolName: string | null
  toolProgress: number
  toolStatus: 'idle' | 'running' | 'starting' | 'complete' | 'error'

  // Agent capabilities
  availableTools: string[]

  // Actions
  addMessage: (message: ChatMessage) => void
  updateLastMessage: (content: string) => void
  appendToLastMessage: (messageId: string, chunk: string) => void
  appendReasoningToMessage: (messageId: string, reasoningChunk: string) => void  // Accumulate reasoning
  updateMessageStreaming: (messageId: string, isStreaming: boolean) => void  // Update streaming status
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  clearMessages: () => void

  // Model management
  setSelectedModel: (model: 'sonnet' | 'haiku') => void

  // Agent Phase Management (NEW)
  setAgentPhase: (phase: AgentPhase) => void

  // Streaming methods (legacy)
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

      // Model selection (default to Sonnet)
      selectedModel: 'sonnet',

      // Agent Phase State Machine (NEW)
      agentPhase: { type: 'idle' },

      // Streaming state (legacy)
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

      // Model management
      setSelectedModel: (model) => set({ selectedModel: model }),

      // Agent Phase Management (NEW)
      setAgentPhase: (phase) => {
        set({ agentPhase: phase })

        // Update legacy state for backward compatibility
        if (phase.type === 'thinking') {
          set({
            isThinking: true,
            thinkingStep: phase.step,
            thinkingMessage: phase.message,
            thinkingElapsed: phase.elapsed
          })
        } else if (phase.type === 'executing_tool') {
          set({
            isThinking: false,
            activeToolName: phase.toolName,
            toolProgress: phase.progress,
            toolStatus: phase.status
          })
        } else if (phase.type === 'responding') {
          set({
            isThinking: false,
            activeToolName: null,
            toolProgress: 0,
            toolStatus: 'idle'
          })
        } else if (phase.type === 'idle') {
          set({
            isThinking: false,
            activeToolName: null,
            toolProgress: 0,
            toolStatus: 'idle'
          })
        }
      },

      // Streaming methods (legacy - kept for backward compatibility)
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