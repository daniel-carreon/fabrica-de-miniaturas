# STREAMING ARCHITECTURE DESIGN - MINIFAB v2.0

## 🎯 OBJETIVO

Transformar MiniFab de **blocking request/response** a **real-time streaming** con visibilidad completa del proceso de pensamiento y tool calling, manteniendo compatibilidad con código existente.

## 📊 EXECUTIVE SUMMARY

**Current State:**
- ❌ Blocking 60-180s waits with zero feedback
- ❌ No progressive text rendering
- ❌ No thinking visualization
- ❌ No tool calling visibility

**Target State:**
- ✅ SSE streaming with 200-500ms first token
- ✅ Progressive text rendering (word-by-word)
- ✅ Real-time thinking modal with animated dots
- ✅ Tool execution visualization with progress
- ✅ 85-95% perceived latency reduction

**Implementation Strategy:** Hybrid approach - keep existing endpoint, add new streaming endpoint

---

## 🏗️ ARCHITECTURE OVERVIEW

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐         ┌──────────────────┐             │
│  │  ChatAgent.tsx  │────────>│ useStreamingChat │             │
│  │  (UI Component) │<────────│     (Hook)       │             │
│  └─────────────────┘         └──────────────────┘             │
│           │                            │                        │
│           ├──> MessageRenderer ────────┤                        │
│           ├──> ThinkingModal ──────────┤                        │
│           └──> ToolCallViz ────────────┤                        │
│                                        │                        │
│                                        ▼                        │
│                              ┌──────────────────┐              │
│                              │   EventSource    │              │
│                              │  (SSE Consumer)  │              │
│                              └──────────────────┘              │
└──────────────────────────────────│──────────────────────────────┘
                                   │ SSE Stream
                                   │ (text/event-stream)
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (FastAPI)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────┐         ┌────────────────────┐         │
│  │ /api/chat         │         │ /api/chat/stream   │  NEW!   │
│  │ (Existing - Keep) │         │ (Streaming SSE)    │         │
│  └────────────────────┘         └────────────────────┘         │
│          │                               │                      │
│          │                               ▼                      │
│          │                      ┌─────────────────┐            │
│          │                      │ Anthropic SDK   │            │
│          │                      │ (Direct, not OR)│            │
│          │                      └─────────────────┘            │
│          │                               │                      │
│          ▼                               ▼                      │
│  ┌────────────────────────────────────────────────┐            │
│  │         Manual OpenRouter HTTP Calls           │            │
│  │  (Current implementation - keep for fallback)  │            │
│  └────────────────────────────────────────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎭 DESIGN DECISIONS

### 1. Dual Endpoint Strategy

**Rationale:** Don't break what works, add new capability alongside.

**Endpoints:**

```python
# EXISTING (Keep as-is)
POST /api/chat
- Returns: Complete JSON response after all processing
- Use case: Fallback, batch operations, testing
- Status: Stable, don't touch

# NEW (Implement)
POST /api/chat/stream
- Returns: SSE stream with incremental updates
- Use case: Interactive chat, real-time feedback
- Status: To implement
```

### 2. Anthropic SDK Direct vs OpenRouter

**Decision:** Use Anthropic SDK directly for streaming, keep OpenRouter for non-streaming.

**Rationale:**
| Criterion | OpenRouter | Anthropic SDK |
|-----------|-----------|---------------|
| Streaming + Tool Calls | ❌ Known bugs | ✅ Works perfectly |
| Setup Complexity | ✅ Already configured | ⚠️ Need to add |
| Cost | ✅ Unified billing | ⚠️ Separate billing |
| Model Access | ✅ All models | ⚠️ Anthropic only |
| Reliability | ⚠️ Proxy issues | ✅ Direct connection |

**Implementation:**
```python
# Install Anthropic SDK
pip install anthropic

# Use for streaming only
import anthropic

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

stream = client.messages.stream(
    model="claude-sonnet-4.5-20250929",  # Latest
    messages=[...],
    tools=[...],
    max_tokens=5000
)
```

### 3. SSE Event Schema

**Event Types:**

```typescript
// 1. Stream start
{
  type: 'start',
  timestamp: number,
  conversation_id: string
}

// 2. Thinking phase (before response)
{
  type: 'thinking',
  step: 'analyzing' | 'planning' | 'executing',
  message: string,
  elapsed_ms: number
}

// 3. Text chunk (streaming response)
{
  type: 'text_delta',
  content: string,  // Incremental chunk
  index: number     // Chunk sequence number
}

// 4. Tool call detected
{
  type: 'tool_call_start',
  tool_name: string,
  tool_args: object,
  tool_id: string
}

// 5. Tool executing
{
  type: 'tool_executing',
  tool_name: string,
  tool_id: string,
  progress: number,  // 0-100
  status: 'running' | 'complete' | 'error'
}

// 6. Tool result
{
  type: 'tool_call_result',
  tool_id: string,
  result: object
}

// 7. Pipeline stage update
{
  type: 'pipeline_update',
  stage: {
    id: string,
    name: string,
    status: 'pending' | 'active' | 'complete' | 'error',
    progress: number
  }
}

// 8. Stream complete
{
  type: 'complete',
  final_response: string,
  usage: object,
  model: string,
  conversation_id: string
}

// 9. Error
{
  type: 'error',
  error: string,
  recoverable: boolean
}
```

### 4. Frontend State Management

**New Zustand Store Slice:**

```typescript
interface StreamingState {
  // Current streaming message
  streamingMessageId: string | null
  streamingContent: string

  // Thinking state
  isThinking: boolean
  thinkingStep: string
  thinkingElapsed: number

  // Tool execution state
  activeTool: string | null
  toolProgress: number
  toolStatus: 'idle' | 'running' | 'complete' | 'error'

  // Actions
  startStreaming: (messageId: string) => void
  appendContent: (chunk: string) => void
  setThinking: (step: string, elapsed: number) => void
  updateToolProgress: (tool: string, progress: number) => void
  completeStreaming: () => void
  handleStreamError: (error: string) => void
}
```

### 5. UI Components Architecture

```
ChatAgent.tsx (Main Container)
├── MessageList
│   ├── MessageRenderer (existing, enhanced)
│   │   └── StreamingCursor (new, animated)
│   └── ThinkingIndicator (new)
│
├── ThinkingModal (new, overlay)
│   ├── AnimatedBrain (Lottie animation)
│   ├── ThinkingSteps (real-time steps)
│   └── ElapsedTimer
│
├── ToolCallVisualization (new, expandable)
│   ├── ToolIcon (dynamic icon based on tool)
│   ├── ToolProgress (animated progress bar)
│   ├── ToolArgs (expandable JSON view)
│   └── ToolResult (formatted result display)
│
└── AgentPipeline (existing, enhanced)
    └── Real-time stage updates via SSE
```

---

## 🔧 IMPLEMENTATION PHASES

### Phase 1: Backend Streaming Foundation (4-6 hours)

**Tasks:**
1.1. Install Anthropic SDK
```bash
pip install anthropic
echo "anthropic>=0.40.0" >> backend/requirements.txt
```

1.2. Create streaming router (`backend/api/chat_streaming_router.py`)
```python
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import anthropic
import json

router = APIRouter()

@router.post("/chat/stream")
async def chat_stream_endpoint(request: ChatRequest):
    """SSE streaming endpoint with Anthropic SDK"""

    async def event_generator():
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

        # Send start event
        yield sse_event('start', {'timestamp': time.time()})

        # Send thinking event
        yield sse_event('thinking', {
            'step': 'analyzing',
            'message': 'Understanding your request...'
        })

        # Stream with Anthropic SDK
        with client.messages.stream(
            model="claude-sonnet-4.5-20250929",
            messages=build_messages(request),
            tools=build_tools(),
            max_tokens=5000
        ) as stream:
            # Text chunks
            for text in stream.text_stream:
                yield sse_event('text_delta', {'content': text})

            # Handle tool calls
            message = stream.get_final_message()
            if message.stop_reason == "tool_use":
                for content in message.content:
                    if content.type == "tool_use":
                        # Execute tool
                        result = await execute_tool(content.name, content.input)
                        yield sse_event('tool_call_result', {
                            'tool_id': content.id,
                            'result': result
                        })

        # Send complete event
        yield sse_event('complete', {'usage': {...}})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

def sse_event(event_type: str, data: dict) -> str:
    """Format SSE event"""
    return f"data: {json.dumps({'type': event_type, **data})}\n\n"
```

1.3. Register router in main.py
```python
from api.chat_streaming_router import router as chat_streaming_router
app.include_router(chat_streaming_router, prefix="/api", tags=["chat-streaming"])
```

1.4. Create tool execution wrapper
```python
async def execute_tool(tool_name: str, tool_input: dict) -> dict:
    """Execute tool with progress updates (yield events)"""
    if tool_name == "generate_avatar":
        # Existing implementation
        return await call_generate_api(...)
    elif tool_name == "combine_images":
        return await call_combine_images_api_multi(...)
    # ...
```

**Validation Criteria:**
- [ ] `POST /api/chat/stream` returns SSE stream
- [ ] First event arrives within 500ms
- [ ] Text chunks stream incrementally
- [ ] Tool calls detected and executed
- [ ] Stream completes with 'complete' event
- [ ] Error handling works (test with invalid requests)

---

### Phase 2: Frontend Streaming Hook (3-4 hours)

**Tasks:**
2.1. Create `useStreamingChat` hook
```typescript
// frontend/src/features/chat/hooks/useStreamingChat.ts

export function useStreamingChat() {
  const { addMessage, appendToLastMessage, setThinking } = useChatStore()
  const [isStreaming, setIsStreaming] = useState(false)

  const sendStreamingMessage = async (message: string) => {
    setIsStreaming(true)

    // Create user message
    const userMsg = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    }
    addMessage(userMsg)

    // Create empty assistant message
    const assistantMsgId = `msg_${Date.now()}_assistant`
    addMessage({
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    })

    // Connect to SSE
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({message, messages: [...], ...})
    })

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const {done, value} = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const event = JSON.parse(line.slice(6))
          handleStreamEvent(event, assistantMsgId)
        }
      }
    }

    setIsStreaming(false)
  }

  const handleStreamEvent = (event: SSEEvent, msgId: string) => {
    switch (event.type) {
      case 'thinking':
        setThinking(event.step, event.message)
        break
      case 'text_delta':
        appendToLastMessage(msgId, event.content)
        break
      case 'tool_call_start':
        // Update pipeline
        break
      case 'complete':
        setThinking(null)
        break
    }
  }

  return { sendStreamingMessage, isStreaming }
}
```

2.2. Update ChatAgent.tsx to use streaming
```typescript
const { sendStreamingMessage, isStreaming } = useStreamingChat()

const handleSend = async () => {
  if (USE_STREAMING) {
    await sendStreamingMessage(input)
  } else {
    // Fallback to existing implementation
    await sendNonStreamingMessage(input)
  }
}
```

2.3. Add streaming cursor component
```typescript
// frontend/src/components/ui/StreamingCursor.tsx
export function StreamingCursor() {
  return (
    <span className="animate-pulse inline-block w-2 h-4 bg-purple-500 ml-1" />
  )
}
```

**Validation Criteria:**
- [ ] User message appears immediately
- [ ] Assistant message starts empty, grows with chunks
- [ ] Cursor animates at end of streaming text
- [ ] Thinking modal shows during 'thinking' events
- [ ] Tool execution updates in real-time
- [ ] Stream completes and cursor disappears
- [ ] Fallback to non-streaming works

---

### Phase 3: UI Components (4-5 hours)

**Tasks:**
3.1. Create ThinkingModal component
```typescript
// frontend/src/components/ui/ThinkingModal.tsx

interface ThinkingModalProps {
  isVisible: boolean
  step: string
  message: string
  elapsed: number
}

export function ThinkingModal({isVisible, step, message, elapsed}: ThinkingModalProps) {
  if (!isVisible) return null

  return (
    <div className="fixed bottom-20 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 animate-slide-up">
      <div className="flex items-center gap-3">
        <BrainAnimation />
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">
            {step}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {message}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {elapsed}ms elapsed
          </p>
        </div>
      </div>
    </div>
  )
}
```

3.2. Create ToolCallVisualization component
```typescript
// frontend/src/components/ui/ToolCallVisualization.tsx

interface ToolCallVizProps {
  toolName: string
  toolArgs: object
  progress: number
  status: 'running' | 'complete' | 'error'
}

export function ToolCallVisualization({toolName, toolArgs, progress, status}: ToolCallVizProps) {
  return (
    <div className="border-l-4 border-purple-500 pl-4 my-3 bg-purple-50 dark:bg-purple-900/20 p-3 rounded">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ToolIcon name={toolName} />
          <span className="font-medium">{toolName}</span>
        </div>
        <StatusBadge status={status} />
      </div>

      {status === 'running' && (
        <ProgressBar progress={progress} className="mt-2" />
      )}

      <details className="mt-2">
        <summary className="text-sm text-gray-600 cursor-pointer">
          View arguments
        </summary>
        <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
          {JSON.stringify(toolArgs, null, 2)}
        </pre>
      </details>
    </div>
  )
}
```

3.3. Enhance MessageRenderer for streaming
```typescript
// Add streaming support to MessageRenderer.tsx

interface MessageRendererProps {
  // ... existing props
  isStreaming?: boolean
}

export function MessageRenderer({content, isStreaming, ...props}: MessageRendererProps) {
  return (
    <div className="message-container">
      <Markdown>{content}</Markdown>
      {isStreaming && <StreamingCursor />}
    </div>
  )
}
```

3.4. Update chatStore with streaming methods
```typescript
// Add to chatStore.ts

appendToLastMessage: (messageId: string, chunk: string) => {
  set(state => ({
    messages: state.messages.map(msg =>
      msg.id === messageId
        ? {...msg, content: msg.content + chunk}
        : msg
    )
  }))
},

setThinking: (step: string | null, message?: string, elapsed?: number) => {
  set({
    isThinking: !!step,
    thinkingStep: step || '',
    thinkingMessage: message || '',
    thinkingElapsed: elapsed || 0
  })
},

updateToolExecution: (toolName: string, progress: number, status: string) => {
  set({
    activeToolName: toolName,
    toolProgress: progress,
    toolStatus: status
  })
}
```

**Validation Criteria:**
- [ ] ThinkingModal appears during thinking phase
- [ ] Modal animates smoothly (slide up from bottom)
- [ ] Elapsed timer updates in real-time
- [ ] ToolCallVisualization shows during tool execution
- [ ] Progress bar animates smoothly
- [ ] Tool arguments are expandable
- [ ] Streaming cursor animates at end of text
- [ ] All components disappear when stream completes

---

### Phase 4: Integration & Testing (3-4 hours)

**Tasks:**
4.1. Create feature flag for streaming
```typescript
// frontend/src/config/features.ts
export const FEATURES = {
  ENABLE_STREAMING: process.env.NEXT_PUBLIC_ENABLE_STREAMING === 'true'
}
```

4.2. Implement graceful fallback
```typescript
const handleSend = async () => {
  try {
    if (FEATURES.ENABLE_STREAMING) {
      await sendStreamingMessage(input)
    } else {
      await sendNonStreamingMessage(input)
    }
  } catch (error) {
    // Fallback to non-streaming on error
    console.warn('Streaming failed, falling back:', error)
    await sendNonStreamingMessage(input)
  }
}
```

4.3. Add comprehensive error handling
```typescript
// In useStreamingChat hook

try {
  // ... streaming logic
} catch (error) {
  if (error instanceof TypeError) {
    // Network error - retry or fallback
  } else if (error.message.includes('timeout')) {
    // Timeout - show user-friendly message
  } else {
    // Unknown error - fallback to non-streaming
  }
}
```

4.4. Create test suite
```typescript
// frontend/src/features/chat/__tests__/streaming.test.ts

describe('Streaming Chat', () => {
  it('should stream text chunks incrementally', async () => {
    // Mock SSE responses
    // Assert message grows with each chunk
  })

  it('should show thinking modal during thinking phase', async () => {
    // Assert ThinkingModal visible
    // Assert step and message update
  })

  it('should visualize tool calling', async () => {
    // Assert ToolCallVisualization appears
    // Assert progress updates
  })

  it('should fallback to non-streaming on error', async () => {
    // Simulate network error
    // Assert fallback triggered
  })
})
```

4.5. Performance testing
```bash
# Backend load testing
k6 run tests/load/streaming_test.js

# Frontend E2E testing
npm run test:e2e -- streaming.spec.ts
```

**Validation Criteria:**
- [ ] Feature flag controls streaming behavior
- [ ] Graceful fallback works (test by disabling backend)
- [ ] Error messages are user-friendly
- [ ] No memory leaks (test with 100+ messages)
- [ ] Performance acceptable (< 100ms overhead per chunk)
- [ ] All tests pass (unit + integration + E2E)
- [ ] Works on mobile (responsive design)

---

## 🚦 VALIDATION CHECKPOINTS

### Checkpoint 1: Backend Streaming Works
```bash
# Test with curl
curl -N -X POST http://localhost:8000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "hello", "messages": []}'

# Expected output:
# data: {"type":"start","timestamp":1234567890}
#
# data: {"type":"thinking","step":"analyzing","message":"..."}
#
# data: {"type":"text_delta","content":"Hello"}
#
# data: {"type":"text_delta","content":" there"}
#
# data: {"type":"complete","usage":{...}}
```

### Checkpoint 2: Frontend Consumes Stream
```typescript
// Open browser console, should see:
// ✅ Stream started
// ✅ Thinking event received
// ✅ Text delta received (x20)
// ✅ Stream complete
```

### Checkpoint 3: UI Updates Smoothly
```
Manual Testing Checklist:
[ ] Message grows word-by-word
[ ] Cursor animates at end
[ ] ThinkingModal appears and disappears
[ ] Tool execution shows progress
[ ] No flickering or jank
[ ] Smooth auto-scroll to bottom
```

### Checkpoint 4: Error Handling
```
Test Scenarios:
[ ] Backend down → Fallback to non-streaming
[ ] Network disconnect mid-stream → Show error, allow retry
[ ] Invalid SSE format → Log error, continue
[ ] Tool execution fails → Show error in ToolCallViz
```

---

## 📈 PERFORMANCE TARGETS

| Metric | Current | Target | How to Achieve |
|--------|---------|--------|----------------|
| Time to First Token | 3-10s | 200-500ms | SSE streaming |
| Perceived Latency | 60-180s | 5-10s | Progressive rendering |
| User Abandonment | ~30% | <5% | Real-time feedback |
| Server Memory | ~200MB | ~250MB | Streaming overhead |
| Frontend FPS | 60fps | 60fps | Efficient React updates |

---

## 🛡️ RISK MITIGATION

### Risk 1: Anthropic API Rate Limits
**Mitigation:** Implement exponential backoff, fallback to OpenRouter

### Risk 2: SSE Connection Drops
**Mitigation:** Auto-reconnect with EventSource retry, fallback to long-polling

### Risk 3: Tool Execution Timeout
**Mitigation:** Stream intermediate progress, allow user to cancel

### Risk 4: Frontend Memory Leaks
**Mitigation:** Cleanup EventSource on unmount, limit message history

### Risk 5: Breaking Changes
**Mitigation:** Feature flag, comprehensive tests, gradual rollout

---

## 📋 IMPLEMENTATION CHECKLIST

### Backend
- [ ] Install Anthropic SDK
- [ ] Create `/api/chat/stream` endpoint
- [ ] Implement SSE event generator
- [ ] Add tool execution with progress updates
- [ ] Add error handling and recovery
- [ ] Add logging and monitoring
- [ ] Write backend tests

### Frontend
- [ ] Create `useStreamingChat` hook
- [ ] Implement SSE consumer with EventSource
- [ ] Update chatStore with streaming methods
- [ ] Create ThinkingModal component
- [ ] Create ToolCallVisualization component
- [ ] Add StreamingCursor component
- [ ] Enhance MessageRenderer for streaming
- [ ] Add feature flag and fallback logic
- [ ] Write frontend tests

### Testing
- [ ] Unit tests for streaming hook
- [ ] Integration tests for SSE flow
- [ ] E2E tests for complete user journey
- [ ] Performance testing (load test)
- [ ] Mobile testing (responsive design)
- [ ] Error scenario testing

### Documentation
- [ ] Update README with streaming setup
- [ ] Add API documentation for `/chat/stream`
- [ ] Create user guide with screenshots
- [ ] Document troubleshooting common issues

---

## 🎯 SUCCESS CRITERIA

**Must Have (MVP):**
- ✅ Text streaming works (word-by-word rendering)
- ✅ Thinking modal shows before first token
- ✅ Tool execution visible in real-time
- ✅ Graceful fallback to non-streaming

**Should Have (v1.0):**
- ✅ Pipeline stages update in real-time
- ✅ Stop generation button works
- ✅ Auto-reconnect on disconnect
- ✅ Mobile-responsive UI

**Nice to Have (v1.1):**
- ⭐ Animated thinking brain (Lottie)
- ⭐ Sound effects for events
- ⭐ Keyboard shortcuts (Ctrl+K to stop)
- ⭐ A/B testing framework

---

## 🚀 ROLLOUT PLAN

### Phase 1: Internal Testing (Week 1)
- Deploy to staging with `ENABLE_STREAMING=true`
- Test all user journeys
- Fix critical bugs

### Phase 2: Beta Release (Week 2)
- Enable for 10% of users via feature flag
- Monitor metrics (latency, errors, abandonment)
- Gather user feedback

### Phase 3: Full Release (Week 3)
- Enable for 100% of users
- Monitor for 72 hours
- Declare stable or rollback

### Phase 4: Cleanup (Week 4)
- Remove non-streaming endpoint if stable
- Remove feature flags
- Update documentation

---

## 📚 REFERENCES

1. **Tldraw Agent Analysis**: `/Users/danielcarreon/Documents/AI/software/minifab/TLDRAW_AGENT_ANALYSIS.md`
2. **Pydantic AI Streaming Research**: `/Users/danielcarreon/Documents/AI/software/minifab/PYDANTIC_AI_STREAMING_RESEARCH.md`
3. **Backend Implementation Analysis**: Generated by Explore agent
4. **Frontend Architecture Analysis**: Generated by Explore agent
5. **Anthropic Streaming Docs**: https://docs.anthropic.com/en/api/messages-streaming
6. **FastAPI SSE Guide**: https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse

---

**Last Updated:** 2025-01-XX
**Author:** Claude Sonnet 4.5 (Architecture Design Agent)
**Status:** ✅ Ready for Implementation
