# Quick Start: Implementing TL;Draw Streaming in Minifab

## Overview
This is a **quick reference** for adapting tldraw-agent's streaming architecture to minifab's Pydantic AI + FastAPI setup.

**Time to implement**: 4-6 hours for basic streaming, 1 day for full UI integration

---

## What You're Building

### Current State (Minifab)
```
User: "Generate 3 images of DANI"
         ↓
[Wait... waiting... waiting...]
         ↓
Response: 3 images appear
```

### After Implementation
```
User: "Generate 3 images of DANI"
         ↓
Thinking... (brain icon)    [Real-time]
Calling generate_images...  [Real-time]
Generated image 1 → appears in gallery
Generated image 2 → appears in gallery
Generated image 3 → appears in gallery
Done! Created 3 images    [Completion message]
```

---

## Implementation Checklist

### Phase 1: Backend Streaming (2 hours)

**File**: `backend/api/stream_router.py`

```python
# NEW FILE
from fastapi import APIRouter, Response
from fastapi.responses import StreamingResponse
import asyncio
import json
import time

router = APIRouter()

@router.post("/api/stream")
async def stream_chat(request: dict):
    """Stream agent responses as Server-Sent Events"""
    
    async def event_generator():
        start_time = time.time()
        try:
            # Get the conversation manager or agent
            from backend.application.services.conversation_service import ConversationService
            service = ConversationService()
            
            # YOUR PYDANTIC AI STREAMING CALL HERE
            async for event in service.stream_response(
                prompt=request.get("prompt"),
                context_images=request.get("selected_images"),
                model=request.get("model", "gpt-4-turbo")
            ):
                # Wrap event in streaming format
                streaming_event = {
                    "type": event.get("type"),  # "think", "tool_call", "generate", etc
                    "data": event.get("data", {}),
                    "complete": event.get("is_final", False),
                    "time": int((time.time() - start_time) * 1000)  # elapsed ms
                }
                
                # Send as SSE
                yield f"data: {json.dumps(streaming_event)}\n\n"
            
            # Signal completion
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            yield f"data: {json.stringify({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
            "Transfer-Encoding": "chunked",
        }
    )

# Add to main.py
# app.include_router(router, prefix="")
```

**File**: `backend/application/services/conversation_service.py` (modify existing)

```python
async def stream_response(self, prompt: str, context_images: list = None, model: str = None):
    """Stream agent response with Pydantic AI"""
    
    agent = Agent(model=model or "openai:gpt-4-turbo")
    
    # Start streaming
    async with agent.run_stream(prompt) as result:
        async for event in result.stream():
            if event.kind == "thinking":
                yield {
                    "type": "think",
                    "data": {"text": event.content},
                    "is_final": False
                }
            
            elif event.kind == "tool-call":
                # Tool is about to be called
                yield {
                    "type": "tool_call",
                    "data": {
                        "name": event.tool_name,
                        "args": event.args,
                        "status": "executing"
                    },
                    "is_final": False
                }
                
                # Execute tool and stream result
                result = await self.execute_tool(event.tool_name, event.args)
                
                yield {
                    "type": "tool_result",
                    "data": {
                        "name": event.tool_name,
                        "result": result
                    },
                    "is_final": False
                }
            
            elif event.kind == "text":
                yield {
                    "type": "message",
                    "data": {"text": event.content},
                    "is_final": False
                }
            
            elif event.kind == "end":
                # Final event
                yield {
                    "type": "complete",
                    "data": {"status": "success"},
                    "is_final": True
                }
```

### Phase 2: Frontend Streaming Hook (1.5 hours)

**File**: `frontend/src/features/chat/hooks/useAgentStream.ts`

```typescript
// NEW FILE
import { useCallback, useState } from 'react'
import { useDispatch } from 'react-redux'

export interface StreamingEvent {
  type: 'think' | 'tool_call' | 'tool_result' | 'message' | 'complete'
  data: Record<string, any>
  complete: boolean
  time: number
}

export function useAgentStream() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentEvent, setCurrentEvent] = useState<StreamingEvent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const dispatch = useDispatch()

  const streamChat = useCallback(
    async (prompt: string, selectedImages: string[] = []) => {
      setIsStreaming(true)
      setError(null)

      try {
        const response = await fetch('/api/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            selected_images: selectedImages,
            model: 'gpt-4-turbo'
          })
        })

        if (!response.body) {
          throw new Error('No response body')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { value, done } = await reader.read()
          if (done) break

          // Decode chunk
          buffer += decoder.decode(value, { stream: true })

          // Split by SSE separator (\n\n)
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            // Parse SSE format: "data: {json}"
            const match = line.match(/^data: (.+)$/)
            if (!match) continue

            if (match[1] === '[DONE]') {
              setIsStreaming(false)
              return
            }

            try {
              const event = JSON.parse(match[1]) as StreamingEvent
              setCurrentEvent(event)

              // Dispatch to Redux/Zustand
              dispatch(addStreamingEvent(event))

              // Handle specific event types
              if (event.type === 'think') {
                console.log('[Thinking]', event.data.text)
              } else if (event.type === 'tool_call') {
                console.log('[Tool]', event.data.name)
              } else if (event.type === 'tool_result') {
                console.log('[Result]', event.data.result)
              }
            } catch (parseErr) {
              console.error('Failed to parse SSE event:', match[1])
            }
          }
        }
      } catch (err: any) {
        setError(err.message)
        console.error('Stream error:', err)
      } finally {
        setIsStreaming(false)
      }
    },
    [dispatch]
  )

  return {
    streamChat,
    isStreaming,
    currentEvent,
    error
  }
}
```

**File**: `frontend/src/features/chat/hooks/useAgentStream.ts` (Redux slice)

```typescript
// In your Redux store
import { createSlice } from '@reduxjs/toolkit'

const streamingSlice = createSlice({
  name: 'streaming',
  initialState: {
    events: [] as StreamingEvent[],
    isActive: false
  },
  reducers: {
    addStreamingEvent: (state, action) => {
      state.events.push(action.payload)
      state.isActive = !action.payload.complete
    },
    clearStreamingEvents: (state) => {
      state.events = []
      state.isActive = false
    }
  }
})

export const { addStreamingEvent, clearStreamingEvents } = streamingSlice.actions
```

### Phase 3: Thinking UI Component (1 hour)

**File**: `frontend/src/features/chat/components/ThinkingIndicator.tsx`

```typescript
// NEW COMPONENT
import { BrainIcon } from 'lucide-react'
import styles from './ThinkingIndicator.module.css'

interface ThinkingIndicatorProps {
  text?: string
  elapsedMs?: number
  isComplete?: boolean
}

export function ThinkingIndicator({
  text = 'Thinking...',
  elapsedMs = 0,
  isComplete = false
}: ThinkingIndicatorProps) {
  return (
    <div className={`${styles.thinking} ${isComplete ? styles.complete : ''}`}>
      <BrainIcon className={styles.icon} size={16} />
      
      <div className={styles.content}>
        <p className={styles.text}>{text}</p>
        {!isComplete && (
          <p className={styles.elapsed}>
            {(elapsedMs / 1000).toFixed(1)}s elapsed
          </p>
        )}
        {isComplete && (
          <p className={styles.elapsed}>
            Completed in {(elapsedMs / 1000).toFixed(1)}s
          </p>
        )}
      </div>
    </div>
  )
}
```

**File**: `frontend/src/features/chat/components/ThinkingIndicator.module.css`

```css
.thinking {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #e0e7ff 0%, #f0f4ff 100%);
  border-left: 3px solid #6366f1;
  border-radius: 8px;
  margin: 8px 0;
}

.icon {
  color: #4f46e5;
  flex-shrink: 0;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  margin-top: 2px;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.content {
  flex: 1;
  min-width: 0;
}

.text {
  margin: 0;
  color: #1e293b;
  font-size: 14px;
  font-weight: 500;
  word-break: break-word;
}

.elapsed {
  margin: 4px 0 0 0;
  color: #64748b;
  font-size: 12px;
}

.complete {
  background: linear-gradient(135deg, #d1fae5 0%, #f0fdf4 100%);
  border-left-color: #10b981;
}

.complete .icon {
  animation: none;
  color: #10b981;
}
```

### Phase 4: Chat History Integration (1.5 hours)

**File**: `frontend/src/features/chat/components/ChatPanel.tsx` (modify existing)

```typescript
import { useAgentStream } from '../hooks/useAgentStream'
import { ThinkingIndicator } from './ThinkingIndicator'

export function ChatPanel() {
  const { streamChat, isStreaming, currentEvent } = useAgentStream()
  const [messages, setMessages] = useState<StreamingEvent[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const input = (e.target as any).input.value

    // Start streaming
    await streamChat(input, selectedImages)
  }

  return (
    <div className="chat-panel">
      {/* Existing chat UI */}
      
      {/* Add thinking indicator */}
      {isStreaming && currentEvent?.type === 'think' && (
        <ThinkingIndicator
          text={currentEvent.data.text}
          elapsedMs={currentEvent.time}
          isComplete={currentEvent.complete}
        />
      )}

      {/* Add tool calling indicator */}
      {currentEvent?.type === 'tool_call' && (
        <div className="tool-call-indicator">
          <span className="spinner" />
          Executing: {currentEvent.data.name}
        </div>
      )}

      {/* Chat input form */}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="input"
          placeholder="Enter prompt..."
          disabled={isStreaming}
        />
        <button type="submit" disabled={isStreaming}>
          {isStreaming ? 'Streaming...' : 'Send'}
        </button>
      </form>
    </div>
  )
}
```

---

## Testing the Implementation

### Test 1: Basic Streaming

```bash
# Terminal 1: Start backend
cd backend
uvicorn main:app --reload

# Terminal 2: Start frontend
cd frontend
npm run dev

# Terminal 3: Test with curl
curl -X POST http://localhost:8000/api/stream \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Generate 2 images of DANI","selected_images":[]}'

# You should see:
# data: {"type":"think","data":{"text":"..."},"complete":false,"time":150}
# data: {"type":"tool_call","data":{"name":"generate_images",...}
# data: [DONE]
```

### Test 2: Browser Test

1. Open http://localhost:3000
2. Go to chat panel
3. Type: "Generate 2 images of DANI"
4. Watch the streaming responses appear in real-time:
   - "Thinking... I need to generate..." (brain icon)
   - "Calling generate_images tool..."
   - Images appear in gallery as they generate
   - "Done!" message

### Test 3: Edge Cases

```python
# Test cancellation
# Frontend: Press Escape to cancel

# Test error handling
# Try invalid prompt: ""  → should show error

# Test long streaming
# Use prompt that requires extended thinking
# Verify time counter updates
```

---

## Key Integration Points with Minifab

### 1. Pydantic AI Stream Events

Your `ConversationService` already has Pydantic AI. Modify it to yield events:

```python
# Before (blocking):
response = await agent.run(prompt)
return response.data

# After (streaming):
async for event in agent.run_stream(prompt):
    if event.kind == "thinking":
        yield {"type": "think", "data": {...}}
```

### 2. Tool Calling Integration

When AI calls `generate_images` tool:

```python
# Yield tool call event
yield {
    "type": "tool_call",
    "data": {
        "name": "generate_images",
        "args": {"prompt": "DANI", "count": 3}
    },
    "is_final": False
}

# Execute tool
images = await generate_images_tool(...)

# Yield result
yield {
    "type": "tool_result",
    "data": {
        "name": "generate_images",
        "result": images
    },
    "is_final": False
}
```

### 3. Image Gallery Updates

When tool result yields, dispatch action to add images:

```typescript
if (event.type === 'tool_result' && event.data.name === 'generate_images') {
  dispatch(addGeneratedImages(event.data.result.images))
}
```

---

## Files Modified/Created

### New Files (4)
- [ ] `backend/api/stream_router.py` - SSE endpoint
- [ ] `frontend/src/features/chat/hooks/useAgentStream.ts` - Stream hook
- [ ] `frontend/src/features/chat/components/ThinkingIndicator.tsx` - Thinking UI
- [ ] `frontend/src/features/chat/components/ThinkingIndicator.module.css` - Styles

### Modified Files (3)
- [ ] `backend/application/services/conversation_service.py` - Add stream_response()
- [ ] `backend/main.py` - Register stream_router
- [ ] `frontend/src/features/chat/components/ChatPanel.tsx` - Use useAgentStream hook

---

## Common Issues & Solutions

### Issue 1: Stream not appearing in browser
**Solution**: Check CORS headers
```python
# Add to FastAPI
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Issue 2: Events arriving slowly
**Solution**: Disable response buffering
- Already handled in StreamingResponse headers
- Verify nginx config: `proxy_buffering off;`

### Issue 3: Partial event data (incomplete JSON)
**Solution**: Implement closing brace logic (like tldraw-agent does)
```python
def close_json(incomplete: str) -> dict:
    """Close unclosed braces for incomplete JSON"""
    # Count open/close
    open_braces = incomplete.count('{') - incomplete.count('}')
    close_str = incomplete + ('}' * open_braces)
    return json.loads(close_str)
```

### Issue 4: Memory leak with streaming
**Solution**: Always call reader.releaseLock()
```typescript
finally {
  reader.releaseLock()
}
```

---

## Performance Tips

1. **Batch events**: Don't yield every character, batch by word
2. **Compress JSON**: Use minified JSON in production
3. **Limit history**: Only keep last 100 events
4. **Debounce UI updates**: Batch updates if events arrive very fast

---

## Next Steps

1. **Implement basic streaming** - Get Phase 1-3 working
2. **Add tool execution UI** - Show which tool is running
3. **Add streaming to other tools** - `combine_images`, etc
4. **Add streaming to model selection** - Show which model is running
5. **Add streaming persistence** - Save streaming events to Supabase
6. **Add streaming analysis** - Track performance metrics

---

## References

- Full analysis: `TLDRAW_AGENT_ANALYSIS.md`
- Architecture diagrams: `TLDRAW_ARCHITECTURE_DIAGRAMS.md`
- TL;Draw repo: `/Users/danielcarreon/Documents/AI/software/tldraw-agent`

---

## Questions?

Key implementation questions:
1. Where is your current `ConversationService`? ✓ (likely in `application/services/`)
2. How are tools currently called? ✓ (Pydantic AI tool_calls)
3. Where should streaming endpoint go? ✓ (New file: `api/stream_router.py`)
4. Should streaming be default or optional? → Optional (keep both request/response and streaming)

