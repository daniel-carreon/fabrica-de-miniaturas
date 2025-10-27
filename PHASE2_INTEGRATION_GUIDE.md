# 📡 PHASE 2.2 - INTEGRATION GUIDE

**Status**: Ready for implementation (after Phase 1 database migrations executed)
**Changes**: Minimal & backward compatible
**Risk**: LOW (no breaking changes to existing endpoints)

---

## 🎯 OBJETIVO

Integrar los nuevos endpoints de conversation manager CON el chat endpoint existente, sin romper nada.

**Patrón**:
- Old `/chat` endpoint sigue funcionando (sin conversation_id)
- New `/chat` endpoint con conversation_id (auto-crea conversación si no existe)
- Ambas versiones coexisten

---

## 📋 TAREAS DE INTEGRACIÓN

### Subtarea 2.1: Registrar Conversation Router en main.py

**Archivo**: `backend/main.py`

**Paso 1**: Agregar import
```python
from api.conversation_router import router as conversation_router
```

**Paso 2**: Registrar router (busca donde se registra chat_router)
```python
# Existing line (keep this):
app.include_router(chat_router)

# Add this new line:
app.include_router(conversation_router)
```

**Antes**:
```python
from api.chat_router import router as chat_router

app = FastAPI()
# ... CORS setup ...

app.include_router(chat_router)
```

**Después**:
```python
from api.chat_router import router as chat_router
from api.conversation_router import router as conversation_router  # NEW

app = FastAPI()
# ... CORS setup ...

app.include_router(chat_router)
app.include_router(conversation_router)  # NEW - conversations endpoints
```

**Validación**:
- [ ] Backend starts sin errores: `bash dev.sh`
- [ ] New endpoint aparece en Swagger: http://localhost:8001/docs

---

### Subtarea 2.2: Crear ConversationStore en Frontend

**Archivo**: `frontend/src/shared/stores/conversationStore.ts`

**Propósito**: Zustand store para manejar conversaciones + Supabase sync

```typescript
import { create } from 'zustand'
import { supabase } from '@/shared/lib/supabase'

export interface Conversation {
  id: string
  title: string
  created_at: string
  is_favorite: boolean
}

interface ConversationStore {
  conversations: Conversation[]
  currentConversationId: string | null
  loading: boolean

  // Actions
  loadConversations: () => Promise<void>
  createConversation: () => Promise<Conversation>
  setCurrentConversation: (id: string) => void
  updateConversationTitle: (id: string, title: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
}

export const useConversationStore = create<ConversationStore>((set) => ({
  conversations: [],
  currentConversationId: null,
  loading: false,

  loadConversations: async () => {
    set({ loading: true })
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/conversations`,
        { headers: { 'Content-Type': 'application/json' } }
      )
      const data = await response.json()
      set({ conversations: data.conversations })
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      set({ loading: false })
    }
  },

  createConversation: async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/conversations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Nueva Conversación' })
        }
      )
      const conversation = await response.json()
      set((state) => ({
        conversations: [conversation, ...state.conversations],
        currentConversationId: conversation.id
      }))
      return conversation
    } catch (error) {
      console.error('Error creating conversation:', error)
      throw error
    }
  },

  setCurrentConversation: (id: string) => {
    set({ currentConversationId: id })
  },

  updateConversationTitle: async (id: string, title: string) => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/conversations/${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title })
        }
      )
      set((state) => ({
        conversations: state.conversations.map((conv) =>
          conv.id === id ? { ...conv, title } : conv
        )
      }))
    } catch (error) {
      console.error('Error updating conversation:', error)
      throw error
    }
  },

  deleteConversation: async (id: string) => {
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/conversations/${id}`,
        { method: 'DELETE' }
      )
      set((state) => ({
        conversations: state.conversations.filter((conv) => conv.id !== id)
      }))
    } catch (error) {
      console.error('Error deleting conversation:', error)
      throw error
    }
  },

  toggleFavorite: async (id: string) => {
    try {
      const conversation = this.conversations.find((c) => c.id === id)
      if (!conversation) return

      await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/conversations/${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_favorite: !conversation.is_favorite })
        }
      )
      set((state) => ({
        conversations: state.conversations.map((conv) =>
          conv.id === id
            ? { ...conv, is_favorite: !conv.is_favorite }
            : conv
        )
      }))
    } catch (error) {
      console.error('Error toggling favorite:', error)
      throw error
    }
  }
}))
```

---

### Subtarea 2.3: Crear ConversationPanel Component

**Archivo**: `frontend/src/features/chat/components/ConversationPanel.tsx`

**Propósito**: Sidebar con lista de conversaciones (similar a ChatGPT)

```typescript
'use client'

import React, { useEffect } from 'react'
import { useConversationStore } from '@/shared/stores/conversationStore'
import { Trash2, Star, Plus } from 'lucide-react'

export function ConversationPanel() {
  const {
    conversations,
    currentConversationId,
    loading,
    loadConversations,
    createConversation,
    setCurrentConversation,
    deleteConversation,
    toggleFavorite
  } = useConversationStore()

  useEffect(() => {
    loadConversations()
  }, [])

  const handleNewConversation = async () => {
    await createConversation()
  }

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={handleNewConversation}
          className="w-full flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          Nueva Conversación
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="text-center text-gray-500 py-4">Cargando...</div>
        ) : conversations.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            Sin conversaciones aún
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`p-3 rounded-lg cursor-pointer group hover:bg-gray-800 transition ${
                  currentConversationId === conv.id ? 'bg-gray-700' : ''
                }`}
                onClick={() => setCurrentConversation(conv.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 truncate">
                    <p className="text-sm font-medium truncate">
                      {conv.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(conv.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(conv.id)
                      }}
                      className="p-1 hover:bg-gray-700 rounded"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          conv.is_favorite ? 'fill-yellow-500' : ''
                        }`}
                      />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteConversation(conv.id)
                      }}
                      className="p-1 hover:bg-red-900/30 rounded"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
```

---

### Subtarea 2.4: Modificar ChatAgent.tsx para usar conversaciones

**Archivo**: `frontend/src/features/chat/components/ChatAgent.tsx`

**Cambios necesarios**:

```typescript
// Add at top
import { useConversationStore } from '@/shared/stores/conversationStore'

// Inside component:
const {
  currentConversationId,
  createConversation,
  setCurrentConversation,
  messages: conversationMessages,
  loadConversationMessages
} = useConversationStore()

// On mount:
useEffect(() => {
  if (currentConversationId) {
    // Load conversation messages
    loadConversationMessages(currentConversationId)
  } else {
    // Auto-create new conversation on first load
    createConversation()
  }
}, [])

// When sending message:
const handleSendMessage = async (message: string) => {
  // Auto-create conversation if needed
  const conversationId = currentConversationId || (await createConversation()).id

  // Send with conversation_id
  const response = await fetch(`/api/chat`, {
    method: 'POST',
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
      messages,
      selectedImages
    })
  })

  // Save message to conversation
  await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({
        conversation_id: conversationId,
        role: 'user',
        content: message
      })
    }
  )
}
```

---

### Subtarea 2.5: Agregar ConversationPanel a layout

**Archivo**: `frontend/src/app/page.tsx`

```typescript
// Add import
import { ConversationPanel } from '@/features/chat/components/ConversationPanel'

// Modify layout
export default function Home() {
  return (
    <div className="flex h-screen">
      <ConversationPanel />  {/* NEW - Sidebar */}
      <main className="flex-1 flex flex-col">
        {/* Existing chat UI */}
      </main>
    </div>
  )
}
```

---

## ✅ VALIDACIÓN PHASE 2.2

Después de cada subtarea, valida:

1. **Subtarea 2.1**: Backend inicia sin errores, `/conversations` aparece en Swagger
2. **Subtarea 2.2**: `useConversationStore` se importa sin errores
3. **Subtarea 2.3**: `ConversationPanel` renderiza sin errores
4. **Subtarea 2.4**: Mensajes se guardan en BD cuando envías en chat
5. **Subtarea 2.5**: Sidebar aparece en UI y puedes crear nuevas conversaciones

---

## 🚨 SI ALGO FALLA

### "Module not found: conversation_router"
→ Verifica imports en main.py, path debe ser relativo desde backend/

### "CORS error calling /conversations"
→ Asegúrate que conversation_router está registrado en FastAPI app

### "TypeError: useConversationStore is not a function"
→ Verifica que Zustand está instalado: `npm list zustand`

---

## 📝 NOTAS

- **Backward compatible**: Old chat endpoint sigue funcionando
- **Auto-create**: Si no hay conversation_id, se crea automáticamente
- **RLS security**: Backend verifica user_id (hardcoded como "daniel" por ahora)
- **Error handling**: Todos los endpoints tienen try/catch

---

## 🎯 SIGUIENTE PASO

Una vez completes 2.5, procede a:
- **Phase 3**: Frontend UI improvements
- **Phase 4**: Pydantic AI investigation
