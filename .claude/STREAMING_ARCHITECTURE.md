# Arquitectura de Streaming en 3 Fases - MiniFab

## 🎯 Objetivo
Separar claramente el flujo de streaming en 3 fases secuenciales y predecibles para mejor UX y debugging.

## 📊 Estado Global: AgentPhase

```typescript
type AgentPhase =
  | { type: 'idle' }
  | { type: 'thinking', step: string, message: string, elapsed: number }
  | { type: 'executing_tool', toolName: string, toolId: string, progress: number, status: 'starting' | 'running' | 'complete' | 'error' }
  | { type: 'responding', textAccumulated: string }
```

## 🔄 Flujo de Eventos Backend → Frontend

### FASE 1: THINKING (Anthropic Decide)
**Duración:** Variable (0-30s con Extended Thinking habilitado)

**Backend Events:**
```python
yield sse_event('thinking_start', {
  'step': 'analyzing',
  'message': 'Claude is analyzing your request...',
  'elapsed_ms': 0
})

# Multiple thinking deltas
yield sse_event('thinking_delta', {
  'content': 'chunk of reasoning...',
  'total_length': 500
})

yield sse_event('thinking_complete', {
  'total_length': 2500,
  'elapsed_ms': 5000
})

# If tool detected
yield sse_event('tool_calls_detected', {
  'tools': [
    {'name': 'generate_avatar', 'id': 'tool_123', 'input': {...}}
  ]
})
```

**Frontend UI:**
- Mostrar `ThinkingModal` flotante (bottom-right)
- Accordion con `ReasoningViewer` si Extended Thinking habilitado

**Checkpoint:** No avanzar a FASE 2 hasta recibir `tool_calls_detected` o `no_tool_needed`

---

### FASE 2: EXECUTION (Backend Ejecuta Tools)
**Duración:** Variable (5-120s dependiendo de la tool)

**Backend Events:**
```python
for tool in detected_tools:
    yield sse_event('tool_execution_start', {
        'tool_name': tool['name'],
        'tool_id': tool['id'],
        'tool_input': tool['input']
    })

    # During execution
    yield sse_event('tool_execution_progress', {
        'tool_id': tool['id'],
        'progress': 50,
        'status': 'running',
        'message': 'Generating images...'
    })

    # After completion
    yield sse_event('tool_execution_complete', {
        'tool_id': tool['id'],
        'tool_name': tool['name'],
        'result': {...},
        'elapsed_ms': 15000
    })
```

**Frontend UI:**
- Mostrar `ToolExecutionModal` (center screen, modal overlay)
- Animated icon del tool (🎨, 🔄, 👤)
- Progress bar si disponible
- Pulsing indicator

**Checkpoint:** No avanzar a FASE 3 hasta todos los tools `complete` o `error`

---

### FASE 3: RESPONDING (Anthropic Responde)
**Duración:** Variable (1-10s)

**Backend Events:**
```python
yield sse_event('response_start', {})

# Word-by-word streaming
yield sse_event('text_delta', {
    'content': 'chunk',
    'index': 500
})

yield sse_event('response_complete', {
    'final_text': 'complete response...',
    'usage': {...}
})
```

**Frontend UI:**
- Cerrar `ToolExecutionModal`
- Mostrar streaming text con cursor parpadeante
- Markdown rendering en tiempo real

---

## 🔒 Validación de Checkpoints

```typescript
// Frontend validation logic
switch (currentPhase.type) {
  case 'thinking':
    // Solo avanzar cuando recibamos tool_calls_detected
    if (event.type === 'tool_calls_detected') {
      setPhase({ type: 'executing_tool', ... })
    }
    break

  case 'executing_tool':
    // Solo avanzar cuando tool esté complete
    if (event.type === 'tool_execution_complete') {
      setPhase({ type: 'responding', ... })
    }
    break

  case 'responding':
    // Acumular texto hasta response_complete
    if (event.type === 'response_complete') {
      setPhase({ type: 'idle' })
    }
    break
}
```

## 🚨 Manejo de Errores

Si cualquier fase falla:
1. Emitir `phase_error` event
2. Mostrar toast/alert específico
3. Revertir a fase `idle`
4. NO continuar al siguiente fase

## 📝 Cambios Necesarios

### Backend (`chat_streaming_router.py`)
- [ ] Separar lógica de streaming de Anthropic (FASE 1)
- [ ] Separar ejecución de tools (FASE 2)
- [ ] Segundo stream de Anthropic con tool results (FASE 3)
- [ ] Emitir eventos de checkpoint entre fases

### Frontend (`useStreamingChat.ts`)
- [ ] Agregar `agentPhase` state a chatStore
- [ ] Validar checkpoints antes de avanzar fase
- [ ] Mapear eventos a transiciones de fase

### Frontend (`ChatAgent.tsx`)
- [ ] Renderizar UI según fase actual
- [ ] Mostrar `ToolExecutionModal` cuando fase = 'executing_tool'

---

## ✅ Beneficios

1. **Debugging claro** - Saber exactamente en qué fase está el sistema
2. **UI predecible** - Usuario ve claramente qué está pasando
3. **Escalabilidad** - Fácil agregar más tools o fases
4. **Testing** - Cada fase se puede testear independientemente
5. **Error recovery** - Fallos no afectan otras fases

---

*Documento creado: 2025-01-31*
*Estado: En diseño*
