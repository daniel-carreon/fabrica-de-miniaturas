# 🔬 INVESTIGACIÓN: UX AGÉNTICA CON STREAMING + TOOL CALLING

**Fecha**: 31 de Octubre de 2025
**Objetivo**: Mapear arquitectura completa para implementar UX de 3 fases con Anthropic Streaming
**Estado**: Fase de Planeación (No Implementation Yet)

---

## 🎯 OBJETIVO DE UX DESEADA (User Request)

El usuario solicita una UX clara con **3 fases visibles**:

1. **THINKING** (Default ON) - Claude piensa antes de responder
2. **TOOL EXECUTION** - Mostrar texto plano parpadeante con nombre de tool
3. **STREAMING** - Continuar streaming de respuesta después de tool execution

### Características Clave Solicitadas:
- ✅ Thinking mode **siempre activado por defecto**
- ✅ UX **minimalista** para tool execution (texto parpadeante)
- ✅ Flujo **continuo** sin interrupciones visuales

---

## 📚 INVESTIGACIÓN: ANTHROPIC API (Documentación Oficial)

### 1. Fine-Grained Tool Streaming (Beta Feature)

**URL**: https://docs.claude.com/en/docs/agents-and-tools/tool-use/fine-grained-tool-streaming

**Key Findings**:
- Header: `fine-grained-tool-streaming-2025-05-14`
- **Beneficio**: Stream tool parameters sin buffering/JSON validation
- **Reduce latencia**: Chunks llegan 3s vs 15s (ejemplo docs)
- **Trade-off**: NO garantiza JSON válido completo (puede truncarse)

**Recomendación de Docs**:
```python
# Wrap invalid JSON in error response
{"INVALID_JSON": "<malformed data>"}
```

### 2. Streaming Event Types (Messages API)

**URL**: https://docs.claude.com/en/api/messages-streaming

**Eventos Disponibles**:

| Event Type | Descripción | Cuándo se emite |
|------------|-------------|-----------------|
| `message_start` | Inicia stream con Message vacío | Al comenzar request |
| `content_block_start` | Inicia nuevo content block | Por cada bloque (thinking, text, tool_use) |
| `content_block_delta` | Delta incremental de contenido | Múltiples veces durante stream |
| `content_block_stop` | Termina content block | Al finalizar cada bloque |
| `message_delta` | Cambios top-level en Message | Durante stream |
| `message_stop` | Termina stream completo | Al finalizar request |
| `ping` | Keep-alive signal | Periódicamente |
| `error` | Condición de error | Cuando hay error |

### 3. Content Block Delta Types (Crítico para UX)

**A) Text Delta** - Respuesta de Claude palabra por palabra
```json
{
  "type": "content_block_delta",
  "index": 0,
  "delta": {"type": "text_delta", "text": "partial text chunk"}
}
```

**B) Thinking Delta** - Extended Thinking (PRE-RESPONSE)
```json
{
  "type": "content_block_delta",
  "index": 0,
  "delta": {"type": "thinking_delta", "thinking": "reasoning step"}
}
```

**C) Input JSON Delta** - Tool parameters streaming
```json
{
  "type": "content_block_delta",
  "index": 1,
  "delta": {"type": "input_json_delta", "partial_json": "{\"location\": \"San Fra"}
}
```

### 4. Flujo de Tool Use en Streaming (Secuencia Real)

**Documentación oficial indica**:

```
1. message_start
2. content_block_start (type: "thinking") ← Extended Thinking block
   └─> content_block_delta (type: "thinking_delta") × N
   └─> content_block_stop
3. content_block_start (type: "tool_use", name: "tool_name", id: "toolu_xxx")
   └─> content_block_delta (type: "input_json_delta") × N
   └─> content_block_stop ← JSON completo aquí
4. message_delta (stop_reason: "tool_use")
5. message_stop
```

**🚨 CRITICAL FINDING**: Claude **NO continúa streaming** después de tool_use automáticamente.
Requiere **segunda llamada** a la API con tool results para obtener respuesta final.

### 5. Agentic Loop Pattern (Multi-Turn)

**Según documentación de Anthropic**:

```python
# Turn 1: User message → Claude thinks → Tool use
response_1 = client.messages.create(...)
# stop_reason: "tool_use"

# Turn 2: Tool results → Claude responds
response_2 = client.messages.create(
    messages=[
        {"role": "user", "content": "..."},
        {"role": "assistant", "content": response_1.content},  # Include tool_use blocks
        {"role": "user", "content": [{"type": "tool_result", "tool_use_id": "...", "content": "..."}]}
    ]
)
# stop_reason: "end_turn"
```

**🎯 ESTO ES FUNDAMENTAL**: Para streaming continuo después de tool execution, necesitamos:
1. Detectar `stop_reason: "tool_use"` en stream
2. Ejecutar tools en backend
3. **Re-invocar** Anthropic API con tool results
4. Continuar streaming de respuesta final

---

## 🗺️ MAPEO: ARQUITECTURA ACTUAL (Codebase)

### Archivos Críticos Identificados

#### Backend (Python/FastAPI)

1. **`backend/api/chat_streaming_router.py`** (CORE)
   - **Líneas 290-558**: Función `event_generator()`
   - **Eventos implementados**:
     - ✅ `thinking_start`, `thinking_delta`, `thinking_complete`
     - ✅ `tool_call_start`, `tool_executing`, `tool_call_result`
     - ✅ `text_delta`, `complete`
     - ✅ `phase_change` (NEW - Architecture v2.1.0)
     - ✅ `tool_calls_detected` (NEW)

2. **`backend/api/chat_router.py`**
   - Endpoints sin streaming (legacy)
   - Tool implementations: `call_generate_api()`, `call_create_images_api()`, `call_combine_images_api_multi()`

3. **`backend/system_prompts/agent_system_prompt.py`**
   - System prompt con tool definitions
   - Define cuándo usar cada tool

#### Frontend (Next.js/React/TypeScript)

1. **`frontend/src/features/chat/hooks/useStreamingChat.ts`** (CORE)
   - **Líneas 33-158**: `handleStreamEvent()`
   - Procesa eventos SSE del backend
   - Actualiza store según tipo de evento

2. **`frontend/src/features/chat/stores/chatStore.ts`** (STATE)
   - **AgentPhase State Machine** (líneas 17-23):
     ```typescript
     type AgentPhase =
       | { type: 'idle' }
       | { type: 'thinking', step, message, elapsed }
       | { type: 'executing_tool', toolName, toolId, progress, status }
       | { type: 'responding', textAccumulated }
     ```
   - Legacy state: `isThinking`, `activeToolName`, `toolStatus`

3. **`frontend/src/components/ui/ToolExecutionModal.tsx`**
   - Modal glassmorphism con animaciones
   - Iconos específicos por tool
   - Progress bar + shimmer animation

4. **`frontend/src/components/ui/ThinkingProcess.tsx`**
   - Componente accordion para reasoning details
   - Muestra final_prompt, tool_used, model

5. **`frontend/src/features/chat/components/ChatAgent.tsx`**
   - Integra todos los componentes
   - Renderiza ToolExecutionModal + ThinkingProcess

### Flujo Actual Implementado (Step-by-Step)

```
USER SENDS MESSAGE
    ↓
[BACKEND] event_generator() inicia
    ↓
① THINKING PHASE
   - Anthropic SDK: client.messages.stream()
   - Event: content_block_start (type: "thinking")
   - Backend emite: phase_change (idle → thinking)
   - Backend emite: thinking_start
   - Loop: content_block_delta (type: "thinking_delta")
     └─> Backend emite: thinking_delta
   - Event: content_block_stop
   - Backend emite: thinking_complete
    ↓
② TOOL DETECTION
   - Event: content_block_start (type: "tool_use")
   - Loop: content_block_delta (type: "input_json_delta")
     └─> Backend acumula JSON en `current_tool_json`
   - Event: content_block_stop
     └─> Backend parsea JSON → tool_use_blocks.append()
   - Backend emite: tool_call_start
   - Backend emite: tool_calls_detected
   - Backend emite: phase_change (thinking → executing_tool)
    ↓
③ TOOL EXECUTION (Backend-side)
   - Backend emite: tool_executing (status: 'running')
   - Backend ejecuta: await call_generate_api() / call_create_images_api() / call_combine_images_api_multi()
   - Backend emite: tool_call_result (con result o error)
    ↓
④ COMPLETION
   - Backend emite: phase_change (executing_tool → idle)
   - Backend emite: complete (con usage, model, elapsed_ms)
   - Stream termina
    ↓
[FRONTEND] useStreamingChat.ts procesa eventos
    ↓
① thinking_start → updateMessageStreaming(true)
② thinking_delta → appendReasoningToMessage()
③ thinking_complete → updateMessageStreaming(false)
④ tool_call_start → updateToolExecution('running')
⑤ tool_call_result → updateToolExecution('complete') + window.dispatchEvent('imagesUpdated')
⑥ text_delta → appendToLastMessage()
⑦ phase_change → setAgentPhase()
⑧ complete → setAgentPhase('idle'), setThinking(null)
    ↓
[UI] Renderiza según estado
   - agentPhase.type === 'thinking' → No hay componente dedicado actualmente
   - agentPhase.type === 'executing_tool' → <ToolExecutionModal />
   - Después: <ThinkingProcess /> (accordion con reasoning_details)
```

---

## ❌ GAPS IDENTIFICADOS (Actual vs Deseado)

### 🔴 GAP #1: NO HAY STREAMING DESPUÉS DE TOOL EXECUTION

**Problema Actual**:
- Stream termina después de tool execution
- Claude **NO genera respuesta final** automáticamente
- Usuario ve modal de tool → luego nada (o solo mensaje estático)

**Causa Root**:
- Anthropic API termina stream con `stop_reason: "tool_use"`
- Backend NO hace segunda llamada a Anthropic con tool results

**Impacto en UX**:
- ❌ No hay fase 3 (streaming post-tool)
- ❌ Usuario NO ve respuesta natural de Claude explicando qué hizo

### 🟡 GAP #2: THINKING MODE NO DEFAULT ON

**Problema Actual**:
- `thinkingEnabled` estado default: `false` (línea 45, ChatAgent.tsx)
- Usuario debe activar manualmente

**UX Deseada**:
- Thinking siempre ON por default

**Solución Simple**:
- Cambiar: `const [thinkingEnabled, setThinkingEnabled] = useState(true)`

### 🟡 GAP #3: NO HAY INDICADOR VISUAL DURANTE THINKING PHASE

**Problema Actual**:
- `ToolExecutionModal` existe para tool execution
- NO hay componente equivalente para thinking phase
- Usuario NO ve feedback visual durante thinking (solo aparece después en accordion)

**UX Deseada**:
- Mostrar indicador minimalista (texto parpadeante) durante thinking
- Similar a ToolExecutionModal pero más sutil

### 🟢 GAP #4: TOOL MODAL ES CORRECTO PERO PUEDE SIMPLIFICARSE

**Problema Actual**:
- ToolExecutionModal tiene glassmorphism complejo
- Usuario pidió "texto plano parpadeante"

**UX Deseada**:
- Versión más minimalista (solo texto + animación blink)

**Decisión**:
- Mantener modal actual como opción
- Crear variante minimalista alternativa

---

## 🏗️ ARQUITECTURA PROPUESTA (Solución a 3 Fases)

### Fase 1: THINKING (con indicador visual)

**Backend**: YA FUNCIONA ✅
- Eventos emitidos: `phase_change (idle → thinking)`, `thinking_start`, `thinking_delta`, `thinking_complete`

**Frontend - Nuevos Cambios**:

1. **Crear `ThinkingIndicator.tsx` minimalista**
```typescript
interface ThinkingIndicatorProps {
  isVisible: boolean
  message?: string
}

export function ThinkingIndicator({ isVisible, message }) {
  if (!isVisible) return null

  return (
    <div className="fixed bottom-20 left-4 z-40">
      <div className="flex items-center gap-2 bg-purple-900/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-purple-500/30">
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
        <span className="text-sm text-purple-200 animate-blink">
          {message || 'Claude está pensando...'}
        </span>
      </div>
    </div>
  )
}
```

2. **Integrar en ChatAgent.tsx**
```typescript
<ThinkingIndicator
  isVisible={agentPhase.type === 'thinking'}
  message={agentPhase.type === 'thinking' ? agentPhase.message : undefined}
/>
```

3. **CSS Animation para blink**
```css
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### Fase 2: TOOL EXECUTION (versión minimalista)

**Backend**: YA FUNCIONA ✅
- Eventos emitidos: `tool_call_start`, `tool_executing`, `tool_call_result`

**Frontend - Opción A (Mantener actual)**:
- ToolExecutionModal actual funciona bien

**Frontend - Opción B (Crear minimalista)**:
```typescript
export function ToolExecutionBadge({ toolName, isVisible }) {
  if (!isVisible) return null

  return (
    <div className="fixed bottom-20 left-4 z-40">
      <div className="flex items-center gap-2 bg-orange-900/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-orange-500/30">
        <Wrench className="w-4 h-4 text-orange-400 animate-spin" />
        <span className="text-sm text-orange-200 animate-blink">
          Ejecutando: {toolName}
        </span>
      </div>
    </div>
  )
}
```

### Fase 3: STREAMING POST-TOOL (🚨 REQUIERE NUEVA IMPLEMENTACIÓN)

**Problema**: Backend termina stream después de tool execution, NO continúa automáticamente.

**Solución**: Implementar **Agentic Loop Pattern** (multi-turn conversation)

#### Backend Changes (chat_streaming_router.py)

**Nueva Función**: `async def event_generator_agentic(request: ChatRequest)`

```python
async def event_generator_agentic(request: ChatRequest):
    """
    Agentic loop generator: Thinking → Tool Use → Tool Execution → Response Streaming

    Flow:
    1. Initial stream: User message → Claude thinks → Tool use detected
    2. Execute tools (backend)
    3. Second stream: Tool results → Claude generates final response
    """
    start_time = time.time()

    # TURN 1: Initial request
    system_prompt = build_system_prompt(request)
    messages = build_messages(request)
    tools = build_tools()

    # ... existing streaming code ...

    # After tool execution completes (línea ~536):
    if tool_use_blocks:
        # Tools executed, now send results back to Claude for final response

        # Build tool result message
        tool_results = []
        for tool_block, result in zip(tool_use_blocks, tool_results_list):
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tool_block['id'],
                "content": json.dumps(result)
            })

        # Send phase change to responding
        yield sse_event('phase_change', {
            'from_phase': 'executing_tool',
            'to_phase': 'responding',
            'elapsed_ms': int((time.time() - start_time) * 1000)
        })

        # TURN 2: Continue conversation with tool results
        messages_turn2 = messages + [
            {
                "role": "assistant",
                "content": [{"type": "tool_use", "id": tb['id'], "name": tb['name'], "input": tb['input']} for tb in tool_use_blocks]
            },
            {
                "role": "user",
                "content": tool_results
            }
        ]

        # Stream Claude's final response
        with client.messages.stream(
            model=selected_model,
            max_tokens=8000,
            system=system_prompt,
            messages=messages_turn2
        ) as stream2:
            for event in stream2:
                if event.type == "content_block_delta":
                    if event.delta.type == "text_delta":
                        text_chunk = event.delta.text
                        yield sse_event('text_delta', {
                            'content': text_chunk,
                            'index': len(text_chunk)
                        })
                        await asyncio.sleep(0)

    # Send completion
    yield sse_event('phase_change', {
        'from_phase': 'responding',
        'to_phase': 'idle',
        'elapsed_ms': int((time.time() - start_time) * 1000)
    })

    yield sse_event('complete', {...})
```

#### Frontend Changes

**useStreamingChat.ts - Nuevo caso en handleStreamEvent**:

```typescript
case 'phase_change':
  const { setAgentPhase } = useChatStore.getState()

  if (event.to_phase === 'responding') {
    setAgentPhase({
      type: 'responding',
      textAccumulated: ''
    })
  }
  // ... existing cases ...
```

**ChatAgent.tsx - Nuevo indicador para responding**:

```typescript
{agentPhase.type === 'responding' && (
  <div className="fixed bottom-20 left-4 z-40">
    <div className="flex items-center gap-2 bg-green-900/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-green-500/30">
      <MessageSquare className="w-4 h-4 text-green-400 animate-pulse" />
      <span className="text-sm text-green-200">
        Generando respuesta...
      </span>
    </div>
  </div>
)}
```

---

## 📋 PLAN DE ACCIÓN DETALLADO (Orden de Implementación)

### 🎯 MILESTONE 1: Thinking Mode Default ON + Visual Indicator

**Objetivo**: Fase 1 funcional con feedback visual

**Archivos a Modificar**:
1. `frontend/src/features/chat/components/ChatAgent.tsx`
   - Línea 45: Cambiar `useState(false)` → `useState(true)`

2. `frontend/src/components/ui/ThinkingIndicator.tsx` (NUEVO)
   - Crear componente minimalista
   - Texto parpadeante + dot pulsante

3. `frontend/tailwind.config.js`
   - Agregar animación `blink`:
   ```js
   animation: {
     'blink': 'blink 1.5s ease-in-out infinite',
   },
   keyframes: {
     blink: {
       '0%, 100%': { opacity: '1' },
       '50%': { opacity: '0.5' },
     },
   }
   ```

4. `frontend/src/features/chat/components/ChatAgent.tsx`
   - Importar ThinkingIndicator
   - Renderizar cuando `agentPhase.type === 'thinking'`

**Testing**:
- ✅ Thinking mode activado por defecto
- ✅ Indicador aparece durante thinking phase
- ✅ Indicador desaparece cuando thinking termina

**Tiempo Estimado**: 30 minutos

---

### 🎯 MILESTONE 2: Tool Execution Badge Minimalista (Opcional)

**Objetivo**: Versión más simple del modal actual

**Archivos a Modificar**:
1. `frontend/src/components/ui/ToolExecutionBadge.tsx` (NUEVO - Opcional)
   - Alternativa minimalista a ToolExecutionModal
   - Mismo posicionamiento que ThinkingIndicator

2. `frontend/src/features/chat/components/ChatAgent.tsx`
   - Switch entre ToolExecutionModal y ToolExecutionBadge según preferencia

**Testing**:
- ✅ Badge aparece durante tool execution
- ✅ Muestra nombre de tool correctamente
- ✅ Badge desaparece cuando tool termina

**Tiempo Estimado**: 20 minutos

**⚠️ DECISIÓN USUARIO**: ¿Mantener modal actual o crear versión minimalista?

---

### 🎯 MILESTONE 3: Agentic Loop - Streaming Post-Tool (CRÍTICO)

**Objetivo**: Fase 3 funcional - Claude responde después de tool execution

**Archivos a Modificar**:

1. **Backend - `backend/api/chat_streaming_router.py`**

   **Cambios en `event_generator()` (línea ~467-536)**:

   ```python
   # Después de tool execution (línea ~536)
   if tool_use_blocks:
       logger.info("🔄 Entering Turn 2: Sending tool results back to Claude")

       # Build tool results array
       tool_results_content = []
       for i, tool_block in enumerate(tool_use_blocks):
           # Assuming results were stored during execution loop
           tool_result = tool_results_list[i]  # Need to collect during execution

           tool_results_content.append({
               "type": "tool_result",
               "tool_use_id": tool_block['id'],
               "content": json.dumps(tool_result) if isinstance(tool_result, dict) else str(tool_result)
           })

       # Build assistant message with tool_use blocks
       assistant_tool_message = {
           "role": "assistant",
           "content": [
               {
                   "type": "tool_use",
                   "id": tb['id'],
                   "name": tb['name'],
                   "input": tb['input']
               }
               for tb in tool_use_blocks
           ]
       }

       # Build user message with tool results
       user_tool_results_message = {
           "role": "user",
           "content": tool_results_content
       }

       # Append to conversation
       messages_turn2 = messages + [assistant_tool_message, user_tool_results_message]

       # Send phase change to responding
       yield sse_event('phase_change', {
           'from_phase': 'executing_tool',
           'to_phase': 'responding',
           'elapsed_ms': int((time.time() - start_time) * 1000)
       })

       logger.info("🚀 Turn 2: Streaming final response from Claude...")

       # Stream Turn 2: Claude's final response
       with client.messages.stream(
           model=selected_model,
           max_tokens=8000,
           system=system_prompt,
           messages=messages_turn2
       ) as stream2:
           for event in stream2:
               event_type = event.type

               if event_type == "content_block_delta":
                   delta = event.delta

                   if delta.type == "text_delta":
                       text_chunk = delta.text
                       full_response += text_chunk
                       yield sse_event('text_delta', {
                           'content': text_chunk,
                           'index': len(full_response)
                       })
                       await asyncio.sleep(0)

           # Get final message from Turn 2
           final_message = stream2.get_final_message()

   # Continue with completion events...
   ```

   **⚠️ CRITICAL**: Necesitamos almacenar `tool_results_list` durante loop de ejecución (línea ~484-536)

   ```python
   # Before loop (línea ~484)
   tool_results_list = []

   # Inside loop (después de cada tool execution)
   tool_results_list.append(result)
   ```

2. **Frontend - `frontend/src/features/chat/hooks/useStreamingChat.ts`**

   **Agregar caso `responding` en `handleStreamEvent()` (línea ~100-129)**:

   ```typescript
   case 'phase_change':
     // ... existing code ...

     } else if (event.to_phase === 'responding') {
       setAgentPhase({
         type: 'responding',
         textAccumulated: ''
       })
     }
   ```

3. **Frontend - `frontend/src/components/ui/RespondingIndicator.tsx` (NUEVO)**

   ```typescript
   'use client'

   import { MessageSquare } from 'lucide-react'

   interface RespondingIndicatorProps {
     isVisible: boolean
   }

   export function RespondingIndicator({ isVisible }: RespondingIndicatorProps) {
     if (!isVisible) return null

     return (
       <div className="fixed bottom-20 left-4 z-40">
         <div className="flex items-center gap-2 bg-green-900/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-green-500/30">
           <MessageSquare className="w-4 h-4 text-green-400 animate-pulse" />
           <span className="text-sm text-green-200">
             Generando respuesta...
           </span>
         </div>
       </div>
     )
   }
   ```

4. **Frontend - `frontend/src/features/chat/components/ChatAgent.tsx`**

   ```typescript
   // Import
   import { RespondingIndicator } from '@/components/ui/RespondingIndicator'

   // Render (después de ToolExecutionModal)
   <RespondingIndicator
     isVisible={agentPhase.type === 'responding'}
   />
   ```

**Testing Completo**:
1. ✅ Enviar mensaje que requiere tool
2. ✅ Ver thinking indicator
3. ✅ Ver tool execution badge/modal
4. ✅ Ver responding indicator después de tool
5. ✅ Ver streaming de respuesta final de Claude
6. ✅ Verificar mensaje completo en chat

**Tiempo Estimado**: 2-3 horas (implementación + testing exhaustivo)

---

### 🎯 MILESTONE 4: Actualizar CHANGELOG.md

**Archivo**: `CHANGELOG.md`

**Agregar nueva versión**:
```markdown
## [2.2.0] - 2025-10-31 - UX Agéntica Completa 🤖

### ✨ Nuevas Características

#### 1. **Thinking Mode Default ON**
- Extended Thinking ahora activado por defecto
- Mejor UX: usuario siempre ve razonamiento de Claude

#### 2. **ThinkingIndicator Component**
- Indicador minimalista durante fase de thinking
- Texto parpadeante + dot pulsante
- Ubicación: Bottom-left corner

#### 3. **Agentic Loop Pattern (Turn 2 Streaming)**
- Backend ahora re-invoca Anthropic después de tool execution
- Claude genera respuesta final explicando qué hizo
- Streaming continuo: Thinking → Tool → Response

#### 4. **RespondingIndicator Component**
- Indicador durante generación de respuesta final
- Feedback visual para fase 3

### 🔧 Cambios Técnicos

#### Backend
- `event_generator()` ahora implementa multi-turn conversation
- Nuevo evento: `phase_change (executing_tool → responding)`
- Tool results enviados de vuelta a Claude automáticamente

#### Frontend
- Nuevos componentes: ThinkingIndicator, RespondingIndicator
- Nueva animación CSS: `blink`
- AgentPhase `responding` completamente funcional

### 📊 Flujo Completo Implementado

```
Usuario envía mensaje
    ↓
[FASE 1: THINKING]
- Indicador: "Claude está pensando..."
- Event: thinking_delta (streaming de razonamiento)
    ↓
[FASE 2: TOOL EXECUTION]
- Indicador: "Ejecutando: generate_avatar"
- Backend ejecuta tool
    ↓
[FASE 3: RESPONDING]
- Indicador: "Generando respuesta..."
- Claude explica qué hizo (streaming)
    ↓
[COMPLETE]
- Usuario ve mensaje completo con respuesta natural
```

### 🎯 UX Mejorada
- ✅ 3 fases claramente visibles
- ✅ Feedback constante durante proceso
- ✅ No más "silencios" después de tool execution
- ✅ Respuestas naturales de Claude
```

**Tiempo Estimado**: 15 minutos

---

## 🧪 TESTING PLAN (Validación Completa)

### Test Case 1: Simple Tool Call (generate_avatar)

**Input**: "Genera 3 retratos de DANI tech reviewer"

**Expected UX Flow**:
1. ⏱️ 0s: ThinkingIndicator aparece ("Claude está pensando...")
2. ⏱️ 2-5s: Thinking completa
3. ⏱️ 5s: ToolExecutionBadge aparece ("Ejecutando: generate_avatar")
4. ⏱️ 5-25s: Tool ejecuta (Replicate API)
5. ⏱️ 25s: RespondingIndicator aparece ("Generando respuesta...")
6. ⏱️ 25-30s: Claude streaming: "He generado 3 retratos de DANI como tech reviewer. Las imágenes muestran..."
7. ✅ Stream completo, mensaje final visible

**Validations**:
- ✅ Thinking indicator visible al inicio
- ✅ Tool indicator durante ejecución
- ✅ Responding indicator después de tool
- ✅ Mensaje final de Claude presente

### Test Case 2: Multiple Tools (combine_images)

**Setup**: Seleccionar 2 imágenes en gallery

**Input**: "Combina estas dos imágenes"

**Expected UX Flow**:
1. ThinkingIndicator → Tool detection
2. ToolExecutionBadge: "Ejecutando: combine_images"
3. RespondingIndicator → Claude streaming response
4. ✅ Mensaje final: "He combinado las 2 imágenes que seleccionaste..."

### Test Case 3: No Tool Required

**Input**: "¿Qué es un LoRA en machine learning?"

**Expected UX Flow**:
1. ThinkingIndicator aparece
2. Thinking completa
3. RespondingIndicator aparece (NO tool execution)
4. Streaming directo de respuesta
5. ✅ Mensaje completo visible

**Validations**:
- ✅ NO debe mostrar ToolExecutionBadge
- ✅ Transition directo de thinking → responding

### Test Case 4: Error Handling

**Input**: Trigger tool error (ej: invalid prompt)

**Expected UX Flow**:
1. ThinkingIndicator
2. ToolExecutionBadge aparece
3. Tool falla → tool_call_result con error
4. RespondingIndicator aparece
5. Claude streaming: "Lo siento, hubo un error..."
6. ✅ Usuario ve explicación del error

---

## 🎓 DECISIONES DE DISEÑO (Rationale)

### ¿Por qué Agentic Loop (Multi-Turn)?

**Alternativa Descartada**: Backend compone respuesta sintética post-tool

**Decisión Tomada**: Re-invocar Claude con tool results

**Razones**:
1. ✅ **Respuestas naturales**: Claude genera explicación en su propio estilo
2. ✅ **Flexibilidad**: Claude puede pedir más tools si necesita
3. ✅ **Consistencia**: Mismo modelo genera thinking + respuesta final
4. ✅ **Best Practice**: Patrón recomendado por Anthropic docs

### ¿Por qué Indicadores Minimalistas vs Modals?

**Usuario pidió**: "texto plano parpadeante"

**Decisión**:
- Thinking: Badge minimalista (bottom-left)
- Tool Execution: Mantener modal glassmorphism (más llamativo, apropiado)
- Responding: Badge minimalista (consistente con thinking)

**Razones**:
- ✅ Thinking/Responding son procesos rápidos → badge suficiente
- ✅ Tool execution es más largo → modal justificado
- ✅ Consistencia visual entre thinking y responding

### ¿Por qué Default ON para Thinking?

**Usuario pidió**: "dejalo como modo as default, siempre al actualizar está como 'thinking'"

**Decisión**: `useState(true)` para `thinkingEnabled`

**Razones**:
1. ✅ Mejor UX: usuario siempre ve razonamiento
2. ✅ Transparencia: muestra cómo piensa Claude
3. ✅ Debugging: más fácil identificar problemas
4. ✅ Costo marginal: ~5-10% más tokens (aceptable)

---

## 📚 REFERENCIAS & RECURSOS

### Documentación Oficial
- [Anthropic Streaming Messages](https://docs.claude.com/en/api/messages-streaming)
- [Fine-Grained Tool Streaming](https://docs.claude.com/en/docs/agents-and-tools/tool-use/fine-grained-tool-streaming)
- [Tool Use Implementation](https://docs.claude.com/en/docs/agents-and-tools/tool-use/implement-tool-use)

### Código Crítico (Referencias Internas)
- Backend Core: `backend/api/chat_streaming_router.py` (líneas 290-558)
- Frontend Core: `frontend/src/features/chat/hooks/useStreamingChat.ts` (líneas 33-314)
- State Machine: `frontend/src/features/chat/stores/chatStore.ts` (líneas 17-188)

### Diagramas de Arquitectura
- Streaming Architecture: `.claude/STREAMING_ARCHITECTURE.md`
- Project Roadmap: `.claude/PRP`

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Pre-Implementation
- [x] Investigar Anthropic API
- [x] Mapear codebase actual
- [x] Identificar gaps
- [x] Diseñar solución
- [x] Documentar plan

### Implementation (Pending)
- [ ] Milestone 1: Thinking default ON + Indicator
- [ ] Milestone 2: Tool badge minimalista (opcional)
- [ ] Milestone 3: Agentic loop (Turn 2 streaming)
- [ ] Milestone 4: Update CHANGELOG

### Testing (Pending)
- [ ] Test Case 1: Simple tool call
- [ ] Test Case 2: Multiple tools
- [ ] Test Case 3: No tool required
- [ ] Test Case 4: Error handling

### Documentation (Pending)
- [ ] Actualizar README si necesario
- [ ] Documentar nuevos componentes
- [ ] Crear video demo para YouTube

---

## 🚀 PRÓXIMOS PASOS (Immediate Actions)

1. **Confirmar con usuario**: ¿Aprobar este plan antes de implementar?
2. **Decidir**: ¿ToolExecutionBadge minimalista o mantener modal actual?
3. **Implementar Milestone 1**: Quick win (30 min)
4. **Implementar Milestone 3**: Core feature (2-3 hrs)
5. **Testing exhaustivo**: Validar 4 test cases
6. **Deploy**: Confirmar funcionamiento en producción

---

**Fin del documento de investigación**
**Autor**: Claude (Sonnet 4.5) + Daniel Carreon
**Metodología**: Ultra-Think Research + Reverse Engineering
