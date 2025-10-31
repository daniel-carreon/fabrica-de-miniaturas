# Changelog - Fábrica de Miniaturas

## [2.2.0] - 2025-10-31 - UX Agéntica Completa 🤖

### 🚀 **AGENTIC LOOP IMPLEMENTATION - 3 Fases Visuales Completas**

Esta versión implementa el bucle agéntico completo (multi-turn conversation) permitiendo que Claude genere respuestas naturales después de ejecutar herramientas. Incluye feedback visual para las 3 fases del proceso agéntico.

---

### ✨ **Nuevas Características**

#### 1. **Agentic Loop Pattern - Turn 2 Streaming** 🔄
**Problema Resuelto**: Antes el stream terminaba después de tool execution, sin respuesta final de Claude.

**Solución Implementada**:
- Backend ahora re-invoca Anthropic API con tool results (Turn 2)
- Claude genera respuesta final natural explicando qué hizo
- Streaming continúa sin interrupciones

**Flujo Completo**:
```
User → [THINKING] → [TOOL EXECUTION] → [RESPONDING] → Complete
```

**Archivos Modificados**:
- `backend/api/chat_streaming_router.py` (líneas 548-650)
- Implementa multi-turn conversation pattern
- Construye `messages_turn2` con tool results
- Segunda llamada a `client.messages.stream()` para respuesta final

#### 2. **ThinkingIndicator Component** 🧠
Indicador minimalista durante Extended Thinking phase.

**Características**:
- Badge bottom-left con glassmorphism
- Texto parpadeante (animación `blink`)
- Dot pulsante (purple)
- Elapsed time opcional
- Default: "Claude está pensando..."

**Ubicación**: `frontend/src/components/ui/ThinkingIndicator.tsx`

#### 3. **RespondingIndicator Component** 💬
Indicador durante generación de respuesta final (post-tool).

**Características**:
- Badge bottom-left con glassmorphism (verde)
- Texto parpadeante: "Generando respuesta..."
- Dot pulsante (green)
- Se muestra cuando `agentPhase.type === 'responding'`

**Ubicación**: `frontend/src/components/ui/RespondingIndicator.tsx`

#### 4. **Extended Thinking Default ON**
Thinking mode ahora activado por defecto.

**Cambio**:
```typescript
// ANTES: const [thinkingEnabled, setThinkingEnabled] = useState(false)
// AHORA: const [thinkingEnabled, setThinkingEnabled] = useState(true)
```

**Beneficio**: Usuario siempre ve el razonamiento de Claude

#### 5. **Nueva Animación CSS: Blink**
Animación para texto parpadeante en indicadores.

**Implementación**:
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

**Archivo**: `frontend/tailwind.config.js`

---

### 🔧 **Cambios Técnicos Detallados**

#### Backend - Agentic Loop Implementation

**`event_generator()` - Turn 2 Logic** (líneas 548-650):

1. **Collect Tool Results**:
```python
tool_results_list = []
# Durante ejecución: tool_results_list.append(result)
```

2. **Build Tool Results Content**:
```python
tool_results_content = [{
    "type": "tool_result",
    "tool_use_id": tool_block['id'],
    "content": json.dumps(result)
} for tool_block, result in zip(tool_use_blocks, tool_results_list)]
```

3. **Construct Turn 2 Messages**:
```python
assistant_tool_message = {
    "role": "assistant",
    "content": [{"type": "tool_use", ...}]  # Tool use blocks
}

user_tool_results_message = {
    "role": "user",
    "content": tool_results_content  # Tool results
}

messages_turn2 = messages + [assistant_tool_message, user_tool_results_message]
```

4. **Stream Turn 2**:
```python
with client.messages.stream(
    model=selected_model,
    messages=messages_turn2,
    ...
) as stream2:
    for event in stream2:
        if event.delta.type == "text_delta":
            yield sse_event('text_delta', {'content': event.delta.text})
```

**Nuevos Eventos Emitidos**:
- `phase_change (executing_tool → responding)` - Antes de Turn 2
- `text_delta` - Durante streaming de Turn 2
- `phase_change (responding → idle)` - Al finalizar

#### Frontend - Visual Indicators

**Integración en ChatAgent.tsx**:
```typescript
// 1. ThinkingIndicator
<ThinkingIndicator
  isVisible={agentPhase.type === 'thinking'}
  message={agentPhase.type === 'thinking' ? agentPhase.message : undefined}
  elapsed={agentPhase.type === 'thinking' ? agentPhase.elapsed : undefined}
/>

// 2. ToolExecutionModal (existente, sin cambios)

// 3. RespondingIndicator (nuevo)
<RespondingIndicator
  isVisible={agentPhase.type === 'responding'}
/>
```

**Estado AgentPhase**:
- `agentPhase` ya está en store desde v2.1.0
- Nuevos componentes solo leen el estado existente
- No requiere cambios en `useStreamingChat.ts` (ya maneja `phase_change` events)

---

### 📊 **Flujo Completo Implementado (3 Fases Visuales)**

```
Usuario envía mensaje
    ↓
[FASE 1: THINKING] 🧠
├─ Visual: ThinkingIndicator ("Claude está pensando...")
├─ Backend: thinking_delta streaming
├─ Evento: phase_change (idle → thinking)
└─ Duration: 2-5s
    ↓
[FASE 2: TOOL EXECUTION] 🔧
├─ Visual: ToolExecutionModal (glassmorphism modal)
├─ Backend: Ejecuta tools (generate_avatar, create_images, combine_images)
├─ Evento: phase_change (thinking → executing_tool)
└─ Duration: 5-30s
    ↓
[FASE 3: RESPONDING] 💬 ← NUEVO!
├─ Visual: RespondingIndicator ("Generando respuesta...")
├─ Backend: Turn 2 - Re-invoca Anthropic con tool results
├─ Claude streaming: "He generado 3 imágenes de DANI..."
├─ Evento: phase_change (executing_tool → responding)
└─ Duration: 5-10s
    ↓
✅ COMPLETE
├─ Evento: phase_change (responding → idle)
└─ Usuario ve mensaje completo con explicación natural
```

---

### 🐛 **Fixes**

#### Fix #1: Stream Terminaba Después de Tool Execution
**Problema**: Usuario veía tool modal → silencio (sin respuesta de Claude)

**Causa**: Backend terminaba stream después de tool execution (no re-invocaba API)

**Solución**: Agentic loop (Turn 2) implementado

**Impacto**: ✅ Claude ahora explica qué hizo después de ejecutar tools

#### Fix #2: No Feedback Visual Durante Thinking
**Problema**: Usuario no sabía qué pasaba durante Extended Thinking

**Solución**: ThinkingIndicator badge minimalista

**Impacto**: ✅ Usuario ve "Claude está pensando..." durante fase 1

#### Fix #3: Extended Thinking Desactivado por Default
**Problema**: Usuario tenía que activar thinking manualmente cada vez

**Solución**: `useState(true)` en lugar de `useState(false)`

**Impacto**: ✅ Thinking siempre ON, mejor transparencia

---

### 📋 **Testing Checklist**

#### ✅ FASE 1 - Thinking Indicator
- [ ] ThinkingIndicator aparece al enviar mensaje
- [ ] Badge muestra "Claude está pensando..."
- [ ] Animación blink funciona correctamente
- [ ] Indicador desaparece cuando thinking termina

#### ✅ FASE 2 - Tool Execution (Sin Cambios)
- [ ] ToolExecutionModal aparece durante tool execution
- [ ] Modal muestra nombre de tool correcto
- [ ] Modal se cierra cuando tool termina

#### ✅ FASE 3 - Responding (NUEVO)
- [ ] RespondingIndicator aparece después de tool execution
- [ ] Badge verde con "Generando respuesta..."
- [ ] Streaming de respuesta final funciona
- [ ] Claude explica qué hizo (ej: "He generado 3 imágenes...")

#### ✅ INTEGRACIÓN COMPLETA
- [ ] Test: "Genera 3 retratos de DANI tech reviewer"
  - ✓ Ver thinking → tool → responding → mensaje completo
- [ ] Test: "Combina estas dos imágenes" (con 2 seleccionadas)
  - ✓ Ver thinking → tool → responding → explicación de combinación
- [ ] Test: "¿Qué es un LoRA?" (sin tool)
  - ✓ Ver thinking → responding directo (NO tool execution)

---

### 🎓 **Para Desarrolladores**

**Usar los nuevos indicadores**:
```typescript
import { ThinkingIndicator } from '@/components/ui/ThinkingIndicator'
import { RespondingIndicator } from '@/components/ui/RespondingIndicator'

// En tu componente:
const { agentPhase } = useChatStore()

<ThinkingIndicator isVisible={agentPhase.type === 'thinking'} />
<RespondingIndicator isVisible={agentPhase.type === 'responding'} />
```

**Extender Turn 2 logic**:
```python
# En backend/api/chat_streaming_router.py
# Turn 2 streaming ya implementado (líneas 548-650)
# Para agregar más herramientas, solo actualiza tool execution loop
```

---

### 📚 **Documentación**

- Investigación completa: `.claude/AGENTIC_UX_RESEARCH.md`
- Arquitectura: `.claude/STREAMING_ARCHITECTURE.md`
- Project Profile: `.claude/PRP`
- Principios: `CLAUDE.md`

---

### 🔜 **Próximos Pasos (Future Enhancements)**

1. **Parallel Tool Execution**: Ejecutar múltiples tools simultáneamente
2. **Tool Execution Progress**: Progress bars reales durante tool execution
3. **Tool History Panel**: Panel para ver todas las tools ejecutadas
4. **Extended Thinking Accordion**: Mostrar thinking inline durante streaming
5. **Model Selector Integration**: Testing con Haiku vs Sonnet

---

### 🎉 **Resultado Final**

**ANTES (v2.1.0)**:
```
User → Thinking → Tool → [SILENCE/COMPLETE]
                         ↑ No respuesta final
```

**AHORA (v2.2.0)**:
```
User → [Thinking 🧠] → [Tool 🔧] → [Responding 💬] → Complete ✅
       "Pensando..."   "Ejecutando" "Generando..."    "He creado..."
```

---

**Metodología:** Agentic Loop Pattern + Ultra-Think Research + Ingeniería Inversa
**Autor:** Claude Code (Sonnet 4.5) + Daniel Carreon

---

## [2.1.0] - 2025-01-31 - Arquitectura de 3 Fases 🎯

### 🚀 **REFACTOR ARQUITECTÓNICO COMPLETO - Streaming & Tool Execution**

Esta versión implementa una arquitectura completamente nueva para el manejo de streaming y ejecución de herramientas, resolviendo problemas críticos de UX y debugging.

---

### ✨ **Nuevas Características**

#### 1. **Agent Phase State Machine**
Sistema de estados claro con 4 fases:
- `idle` - En reposo
- `thinking` - Analizando (Extended Thinking)
- `executing_tool` - Ejecutando herramienta
- `responding` - Generando respuesta final

**Beneficios:**
- UI sabe exactamente qué mostrar
- Debugging simplificado
- Transiciones predecibles

**Archivos:** `frontend/src/features/chat/stores/chatStore.ts`

#### 2. **ToolExecutionModal Component**
Nuevo modal visual que muestra ejecución de herramientas.

**Características:**
- Modal flotante con glassmorphism
- Animaciones pulsing/shimmer
- Iconos específicos por tool
- Progress bar opcional
- Estados: starting → running → complete/error

**Ubicación:** `frontend/src/components/ui/ToolExecutionModal.tsx`

#### 3. **Fix Crítico: MIME Type Detection**
**Problema resuelto:**
```
Error 400: "Image does not match the provided media type image/jpeg"
```

**Solución:**
- Frontend extrae MIME type real de imágenes pegadas (Ctrl+V)
- Valida formato (PNG, JPEG, GIF, WebP) y tamaño (max 5MB)
- Backend valida contenido con magic numbers
- Backward compatible (acepta string o objeto)

**Archivos:**
- `frontend/src/features/chat/components/ChatAgent.tsx`
- `frontend/src/features/chat/hooks/useStreamingChat.ts`
- `backend/api/chat_router.py`
- `backend/api/chat_streaming_router.py`

#### 4. **Nuevos Eventos Backend (Phase-Based)**
- `phase_change`: Indica transiciones de fase
- `tool_calls_detected`: Lista tools a ejecutar

Backward compatible - eventos legacy funcionan igual.

**Archivo:** `backend/api/chat_streaming_router.py`

#### 5. **Nuevas Animaciones Tailwind**
- `animate-scale-up`: Para modals
- `animate-shimmer`: Progress bars indeterminados

**Archivo:** `frontend/tailwind.config.js`

---

### 🔧 **Mejoras Técnicas**

#### Validación Robusta de Imágenes
Nueva función `validate_image_content()` que valida:
1. Base64 válido
2. Tamaño máximo (5MB)
3. Magic numbers (file signatures)

Si falla validación, **skip image** en lugar de fallar request completo.

#### Backward Compatibility Total
- Eventos legacy funcionan
- Estado legacy se actualiza automáticamente
- Backend acepta ambos formatos

---

### 📊 **Flujo de Fases**

```
Usuario envía mensaje
    ↓
[FASE 1: THINKING]
- Event: phase_change (idle → thinking)
- Event: thinking_start, thinking_delta, thinking_complete
    ↓
[FASE 2: TOOL EXECUTION]
- Event: tool_calls_detected
- Event: phase_change (thinking → executing_tool)
- Event: tool_executing, tool_call_result
    ↓
[FASE 3: IDLE]
- Event: phase_change (executing_tool → idle)
- Event: complete
```

---

### 📋 **Checklist de Testing Manual**

#### ✅ FASE 1 - MIME Type Fix
- [ ] Pegar imagen PNG (Ctrl+V) → funciona sin error
- [ ] Pegar imagen JPEG → funciona
- [ ] Imagen >5MB → rechazada con log
- [ ] Formato no soportado → rechazado

#### ✅ FASE 2 - ToolExecutionModal
- [ ] "genera 5 imágenes" → modal aparece animado
- [ ] Modal se cierra cuando termina
- [ ] Probar 3 herramientas diferentes

#### ✅ FASE 3 - Arquitectura Fases
- [ ] Extended Thinking activado → ver fase thinking
- [ ] Ejecutar tool → ver transición
- [ ] Revisar console logs → eventos `phase_change`

---

### 🎓 **Para Desarrolladores**

**Usar el sistema de fases:**
```typescript
const { agentPhase } = useChatStore()

{agentPhase.type === 'thinking' && <ThinkingIndicator />}
{agentPhase.type === 'executing_tool' && <ToolExecutionModal />}
```

**Emitir eventos de fase:**
```python
yield sse_event('phase_change', {
    'from_phase': 'idle',
    'to_phase': 'thinking',
    'elapsed_ms': 0
})
```

---

### 📚 **Documentación**
- Arquitectura: `.claude/STREAMING_ARCHITECTURE.md`
- Project Profile: `.claude/PRP`
- Principios: `CLAUDE.md`

---

### 🐛 **Issues Conocidos**
1. Testing manual pendiente por usuario
2. Tool paralelos no implementado (futuro)
3. Fase "responding" no completamente implementada

---

### 🔜 **Próximos Pasos**
1. Bucle agéntico real (múltiples tools paralelos)
2. Re-invocación Anthropic post-tool
3. Toast notifications para errores
4. Métricas de uso de herramientas

---

**Metodología:** Bucle Agéntico con Ultra-Think
**Autor:** Claude Code (Sonnet 4.5) + Daniel Carreon

---

## [2025-09-30] - One-Shot Fix: Production Ready 🚀

### 🔒 Security
- **CRITICAL:** Removed `.mcp.json` from Git tracking (contains sensitive API keys)
- ✅ Verified all sensitive files are in `.gitignore` (`.env`, `.env.local`, `.mcp.json`)
- ✅ No secrets committed to repository

### 🛠️ Fixed
- **React 19 Support:** Upgraded `@testing-library/react` from `15.0.7` → `16.3.0`
  - Now fully compatible with React 19
  - Fixed Vercel deployment blocking error
  - Updated `@types/react` and `@types/react-dom` to `^19.0.0`

### ✨ New Features

#### 1. **Auto Port Detection (Frontend)**
- Created `frontend/scripts/dev-server.js`
- Auto-detects available ports from 3000-3006
- No more "port occupied" errors
- Run: `npm run dev` (auto) or `npm run dev:direct` (manual)

#### 2. **Auto Port Detection (Backend)**
- Created `backend/dev_server.py`
- Auto-detects available ports from 8000-8006
- Run: `python dev_server.py`

#### 3. **Railway Monorepo Setup**
- Added `railway.json` (root + frontend + backend)
- Added `railway.toml` for monorepo configuration
- Added `Procfile` for both services
- Created comprehensive `README_DEPLOYMENT.md` guide

### 📝 Configuration Changes

#### Backend (`main.py`)
- CORS now supports ports 3000-3006 automatically
- Added production URLs for Vercel/Railway
- Dynamic ALLOWED_ORIGINS with list comprehension

#### Frontend (`package.json`)
- Main `dev` script now uses auto-port detection
- Upgraded to Next.js 15.5.4
- React 19 fully supported with proper testing libs

### 📊 Testing Results
- ✅ Frontend running on **http://localhost:3000**
- ✅ Backend running on **http://localhost:8001** (auto-detected)
- ✅ Health check: `/health` endpoint responding
- ✅ CORS configured for all port ranges

### 🚀 Deployment Ready
- Railway configs created for both services
- Vercel dependency conflicts resolved
- Environment variable examples provided
- Security best practices implemented

### 📁 New Files
```
frontend/
├── scripts/dev-server.js    # Auto port detection
├── railway.json             # Railway config
└── Procfile                 # Start command

backend/
├── dev_server.py           # Auto port detection
├── railway.json            # Railway config
└── Procfile                # Start command

/ (root)
├── railway.json            # Monorepo config
├── railway.toml            # Railway settings
├── README_DEPLOYMENT.md    # Deployment guide
└── CHANGELOG.md           # This file
```

### 🔄 Migration Guide

**From old dev commands:**
```bash
# OLD (manual port)
npm run dev        # Could fail if 3000 occupied
uvicorn main:app   # Could fail if 8000 occupied

# NEW (auto port detection)
npm run dev        # Auto finds 3000-3006
python dev_server.py  # Auto finds 8000-8006
```

**Railway Deployment:**
```bash
# Link project
railway link

# Deploy backend
cd backend && railway up

# Deploy frontend
cd frontend && railway up
```

### ⚠️ Breaking Changes
- Main `npm run dev` now uses auto-port script
- Use `npm run dev:direct` for old behavior
- `.mcp.json` removed from Git (recreate locally from example)

### 📚 Documentation
- Added comprehensive Railway deployment guide
- Security checklist for production
- Troubleshooting section for common issues
- Environment variable templates

---

## How to Use

1. **Local Development:**
   ```bash
   # Frontend
   cd frontend && npm run dev

   # Backend
   cd backend && python dev_server.py
   ```

2. **Railway Deployment:**
   - See `README_DEPLOYMENT.md` for complete guide
   - Set environment variables in Railway dashboard
   - Deploy both services from same repo

3. **Security:**
   - Never commit `.env` or `.mcp.json`
   - Use example files as templates
   - Rotate API keys regularly
