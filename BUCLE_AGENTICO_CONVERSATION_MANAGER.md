# 🔄 BUCLE AGENTICO - CONVERSATION MANAGER IMPLEMENTATION

**Fecha**: 27 Octubre 2025
**Objetivo**: Implementar gestor de conversaciones sin romper lo que funciona
**Estrategia**: Reverse-engineering arbrain + patrón tldraw + Pydantic AI híbrido

---

## 📋 FASES DELIMITADAS (Bucle Iterativo)

### ✅ **PHASE 1: DATABASE SCHEMA MIGRATIONS**
**Status**: IN PROGRESS
**Duración estimada**: 30 min
**Riesgo**: BAJO (sin cambios en código existente)

#### Subtareas:
- [ ] **1.1** Crear migración Supabase: tabla `conversations`
  - Campos: id (UUID), title, created_at, is_favorite, metadata (JSONB)
  - Validation: RLS policies (solo usuario actual puede ver)
  - Rollback plan: Drop table si falla

- [ ] **1.2** Crear migración Supabase: tabla `chat_messages`
  - Campos: id (UUID), conversation_id (FK), role, content, tool_result (JSONB), created_at
  - Indexes: conversation_id para queries rápidas
  - Validation: Foreign key constraint

- [ ] **1.3** Crear migración: tabla `conversation_images`
  - Campos: id, conversation_id, image_url, image_id, created_at
  - Purpose: Link imágenes generadas a conversación
  - Validation: Optional FK (algunas imágenes no tienen conversación)

- [ ] **1.4** VALIDACIÓN PHASE 1
  - [ ] Conectar a Supabase y listar tablas
  - [ ] Verificar RLS policies funcionan
  - [ ] Verificar indexes existen
  - [ ] **BLOQUEO**: No proceder a Phase 2 si esto falla

---

### 🔄 **PHASE 2: BACKEND API - CONVERSATION ROUTER**
**Status**: PENDING
**Duración estimada**: 1 hora
**Dependencia**: Phase 1 completado ✅

#### Subtareas:
- [ ] **2.1** Copiar/Adaptar SQLModel models desde arbrain
  - Archivo: `backend/domain/models.py` (crear)
  - Modelos: Conversation, ChatMessage, ConversationImage
  - Validación: Pydantic validators (no vacíos, límites de tamaño)

- [ ] **2.2** Crear `conversation_router.py` (endpoints CRUD)
  - [ ] `POST /conversations` - Crear nueva conversación
  - [ ] `GET /conversations` - Listar conversaciones del usuario
  - [ ] `GET /conversations/{id}` - Obtener una conversación + mensajes
  - [ ] `PUT /conversations/{id}` - Actualizar título/favorito
  - [ ] `DELETE /conversations/{id}` - Eliminar conversación
  - Validación: Todos con rate limiting

- [ ] **2.3** Crear `conversation_messages_router.py`
  - [ ] `GET /conversations/{id}/messages` - Paginated messages
  - [ ] `POST /conversations/{id}/messages` - Guardar mensaje (desde chat)
  - Validación: Límite 100 mensajes por request

- [ ] **2.4** Integrar con chat actual SIN romper
  - Modificar `chat_router.py`: Agregar conversation_id a ChatRequest
  - Cuando POST `/chat`: Auto-crear/actualizar conversación
  - Guardar mensaje en tabla después de respuesta
  - **CRITICAL**: Old endpoints siguen funcionando (backward compatible)

- [ ] **2.5** VALIDACIÓN PHASE 2
  - [ ] Test POST /conversations - crea en Supabase
  - [ ] Test GET /conversations - devuelve lista
  - [ ] Test old POST /chat - aún funciona sin conversation_id
  - [ ] Test new POST /chat - crea conversación automática
  - [ ] **BLOQUEO**: No proceder si old chat endpoint se rompe

---

### 🎨 **PHASE 3: FRONTEND - CONVERSATION HISTORY UI**
**Status**: PENDING
**Duración estimada**: 1.5 horas
**Dependencia**: Phase 2 completado ✅

#### Subtareas:
- [ ] **3.1** Crear `ConversationStore` (Zustand + Supabase)
  - Archivo: `frontend/src/shared/stores/conversationStore.ts`
  - Funciones: loadConversations(), saveMessage(), getCurrentConversation()
  - Hybrid sync: localStorage para instant UI, Supabase para persistencia
  - Validación: Sincronización bidireccional

- [ ] **3.2** Crear componente `ConversationPanel.tsx`
  - Sidebar con lista de conversaciones
  - Botón "Nueva conversación"
  - Cada item: title, fecha, botones delete/favorite
  - Inline editing para títulos
  - Styling: Similar a ChatGPT sidebar

- [ ] **3.3** Modificar `ChatAgent.tsx`
  - [ ] Al iniciar: Cargar última conversación O crear nueva
  - [ ] Al enviar mensaje: guardar en conversación actual
  - [ ] Botón "Nueva conversación" en UI
  - [ ] Mostrar título conversación actual
  - **CRITICAL**: No romper chat actual

- [ ] **3.4** Integrar carga de conversaciones pasadas
  - [ ] Click en conversación histórica: cargar mensajes
  - [ ] Auto-scroll a último mensaje
  - [ ] Placeholder si conversación vacía
  - Validación: Mensajes cargan en orden correcto

- [ ] **3.5** VALIDACIÓN PHASE 3
  - [ ] Crear conversación nueva - aparece en sidebar
  - [ ] Enviar mensajes - se guardan en Supabase
  - [ ] Cargar conversación vieja - mensajes aparecen
  - [ ] Actualizar título - se guarda
  - [ ] Favoritar - marca como favorito
  - [ ] **BLOQUEO**: No proceder si chat se rompe

---

### 🤖 **PHASE 4: PYDANTIC AI INVESTIGATION & HYBRID SETUP**
**Status**: PENDING
**Duración estimada**: 2 horas
**Dependencia**: Phase 3 completado ✅

#### Subtareas:
- [ ] **4.1** Crear `/chat-v2` endpoint con Pydantic AI (EXPERIMENTAL)
  - [ ] Nuevos modelos: GenerateAvatarArgs, CreateImagesArgs, CombineImagesArgs
  - [ ] Config Pydantic AI con OpenRouter
  - [ ] Copiar system prompt y tools (mismo que v1)
  - Validación: Responde igual que /chat v1

- [ ] **4.2** Implementar auto-retry en Pydantic AI
  - Configurar retry_config (max_retries=3)
  - Test: Malformed JSON → auto-retry
  - Validación: Sin fallos por JSON inválido

- [ ] **4.3** Frontend toggle: /chat vs /chat-v2
  - [ ] Agregar setting "Experimental Pydantic AI"
  - [ ] Route al endpoint correcto según setting
  - Validación: A/B testing posible

- [ ] **4.4** Análisis de impacto
  - Comparar latencia v1 vs v2
  - Comparar error rates
  - Documentar beneficios reales
  - Recomendación: mantener v1 o migrar

- [ ] **4.5** VALIDACIÓN PHASE 4
  - [ ] /chat-v2 devuelve mismas imágenes que /chat
  - [ ] Retry logic funciona (test con payloads malos)
  - [ ] Toggle UI funciona correctamente
  - [ ] Sin breaking changes en /chat v1

---

### 📊 **PHASE 5: CLOUDFLARE/SSE STREAMING (BONUS - Si tiempo)**
**Status**: PENDING
**Duración estimada**: 1 hora
**Dependencia**: Phase 3+ completado

#### Subtareas:
- [ ] **5.1** Implementar Server-Sent Events en FastAPI
  - Pipeline stages → emit en tiempo real
  - Frontend usa EventSource API
  - Validación: User ve [20%] Analyzing... en real-time

- [ ] **5.2** Frontend SSE listener en ChatAgent.tsx
  - Connect a EventSource
  - Parse eventos JSON
  - Update progress bar visual
  - Validación: Feedback visual funciona

---

## 🎯 **VALIDATION CHECKLIST** (Bucle Iterativo - NO SALTAR)

Para cada PHASE:
```
ANTES de pasar a siguiente:
- [ ] Todos los tests pasan
- [ ] No hay breaking changes
- [ ] Código commiteado
- [ ] Documentación actualizada
- [ ] Developer (yo) revisa manualmente en navegador
```

---

## 📂 **ARCHIVOS A CREAR/MODIFICAR**

### Backend (Python/FastAPI)
```
backend/
├── api/
│   ├── conversation_router.py          [NEW]
│   ├── conversation_messages_router.py [NEW]
│   └── chat_router.py                  [MODIFY - conversation_id support]
├── domain/
│   └── models.py                       [NEW - SQLModel models]
├── infrastructure/
│   └── conversation_repository.py      [NEW - Supabase queries]
└── supabase/
    └── migrations/
        ├── 001_create_conversations.sql    [NEW]
        ├── 002_create_chat_messages.sql    [NEW]
        └── 003_create_conversation_images.sql [NEW]
```

### Frontend (React/TypeScript)
```
frontend/src/
├── shared/
│   └── stores/
│       └── conversationStore.ts        [NEW]
├── features/
│   ├── chat/
│   │   ├── components/
│   │   │   └── ConversationPanel.tsx   [NEW]
│   │   └── ChatAgent.tsx               [MODIFY - load conversation]
│   └── images/
│       └── (sin cambios)
└── app/
    └── page.tsx                        [MODIFY - add ConversationPanel]
```

---

## 🚨 **CRITICAL DECISION POINTS**

1. **Estructura conversaciones**: Multi-conversation (arbrain style) o One-per-session (tldraw style)?
   - **Recomendación**: Start simple (one-per-session), upgrade later

2. **Pydantic AI**: ¿Full migration o hybrid coexistence?
   - **Recomendación**: Hybrid (/chat v1 + /chat-v2), A/B test, decidir después

3. **Streaming SSE**: ¿Implementar ahora o después?
   - **Recomendación**: After Phase 3 completado, Phase 5 es bonus

---

## ⏱️ **TIMELINE ESTIMADO**

| Phase | Tiempo | Status |
|-------|--------|--------|
| 1. Database | 30 min | IN PROGRESS |
| 2. Backend API | 1 hora | PENDING |
| 3. Frontend UI | 1.5 horas | PENDING |
| 4. Pydantic AI | 2 horas | PENDING |
| 5. SSE Streaming | 1 hora | BONUS |
| **TOTAL** | **6 horas** | |

---

## 🔗 **REFERENCIAS**

- arbrain: `/Users/danielcarreon/Documents/AI/software/arbrain`
- tldraw-agent: `/Users/danielcarreon/Documents/AI/software/tldraw-agent`
- Skill Pydantic AI: `.claude/skills/agent-builder-pydantic-ai/SKILL.md`
- Analysis doc: `CONVERSATION_MANAGER_ULTRATHINK_ANALYSIS.md`

---

**ESTADO**: Esperando confirmación para proceder con Phase 1 implementación.
