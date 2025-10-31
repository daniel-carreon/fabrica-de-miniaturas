# TL;Draw Agent Streaming & Thinking UI Analysis

## Executive Summary

The tldraw-agent demonstrates a sophisticated streaming architecture using:
- **Server-Sent Events (SSE)** for streaming AI responses
- **Vercel AI SDK** (`ai` package v5.0.15) for underlying streaming infrastructure
- **Real-time action parsing** with incremental JSON parsing
- **Visual streaming UI** that shows agent reasoning and tool execution in real-time
- **Tool calling abstraction** through "Actions" - a pluggable system for agent capabilities

---

## Part 1: Architecture Overview

### High-Level Flow

```
User Input (Chat Panel)
    ↓
TldrawAgent.prompt() - Prepare request
    ↓
requestAgent() - Format and send to backend
    ↓
/stream endpoint (SSE) - Backend streams responses
    ↓
AgentService.stream() - Yields Streaming<AgentAction> events
    ↓
streamAgent() - Frontend parses SSE + yields actions
    ↓
ChatHistory UI - Renders actions in real-time
```

### Key Technologies
- **Backend**: Express.js + Vercel AI SDK (`ai` package)
- **Frontend**: React + Vite + Tldraw Canvas library
- **Models**: Anthropic, OpenAI, Google Generative AI (via Vercel AI SDK)
- **Database**: Supabase (for conversation history)
- **Streaming**: Standard Web APIs (Fetch + ReadableStream)

---

## Part 2: Backend Streaming Implementation

### 2.1 Express Stream Handler (`server/routes/stream.ts`)

**File**: `/Users/danielcarreon/Documents/AI/software/tldraw-agent/server/routes/stream.ts`

```typescript
export async function streamHandler(req: Request, res: Response) {
  // 1. SETUP SSE HEADERS
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  // 2. CREATE AGENT SERVICE
  const agentService = createAgentService()

  // 3. STREAM RESPONSES
  try {
    for await (const event of agentService.stream(prompt)) {
      const data = JSON.stringify(event)
      res.write(`data: ${data}\n\n`)  // SSE format: "data: {json}\n\n"
    }
    res.write('data: [DONE]\n\n')      // Signal completion
    res.end()
  } catch (streamError) {
    res.write(`data: ${JSON.stringify({ error: streamError.message })}\n\n`)
    res.end()
  }
}
```

**Key Points**:
- Uses standard SSE format: `data: {json}\n\n`
- Sets proper headers for streaming (no buffering, keep-alive)
- Sends `[DONE]` signal when stream ends
- Handles errors gracefully within the stream

### 2.2 AgentService (`worker/do/AgentService.ts`)

**File**: `/Users/danielcarreon/Documents/AI/software/tldraw-agent/worker/do/AgentService.ts`

The AsyncGenerator pattern for streaming:

```typescript
export class AgentService {
  async *stream(prompt: AgentPrompt): AsyncGenerator<Streaming<AgentAction>> {
    const modelName = getModelName(prompt)
    const model = this.getModel(modelName)
    for await (const event of streamActions(model, prompt)) {
      yield event
    }
  }
}

async function* streamActions(
  model: LanguageModel,
  prompt: AgentPrompt
): AsyncGenerator<Streaming<AgentAction>> {
  // START WITH OPENING JSON
  messages.push({
    role: 'assistant',
    content: '{"actions": [{"_type":',  // Forces JSON structure
  })

  const { textStream } = streamText({
    model,
    system: systemPrompt,
    messages,
    maxOutputTokens: 8192,
    temperature: 0,
    providerOptions: {
      anthropic: { thinking: { type: 'disabled' } },
      google: { thinkingConfig: { thinkingBudget: 128 } },
    },
  })

  let buffer = '{"actions": [{"_type":'
  let cursor = 0
  let maybeIncompleteAction: AgentAction | null = null

  // INCREMENTAL PARSING LOOP
  for await (const text of textStream) {
    buffer += text
    
    // Try to parse the buffer as JSON
    const partialObject = closeAndParseJson(buffer)
    if (!partialObject) continue
    
    const actions = partialObject.actions
    
    // YIELD COMPLETED ACTIONS
    if (actions.length > cursor) {
      const action = actions[cursor - 1] as AgentAction
      if (action) {
        yield { ...action, complete: true, time: Date.now() - startTime }
        cursor++
      }
    }
    
    // YIELD INCOMPLETE (STREAMING) ACTION
    const action = actions[cursor - 1] as AgentAction
    if (action) {
      yield { ...action, complete: false, time: Date.now() - startTime }
    }
  }

  // COMPLETE FINAL ACTION
  if (maybeIncompleteAction) {
    yield { ...maybeIncompleteAction, complete: true, time: Date.now() - startTime }
  }
}
```

**Critical Innovation**: Streaming Wrapper Type

```typescript
// shared/types/Streaming.ts
export type Streaming<T> =
  | (Partial<T> & { complete: false; time: number })
  | (T & { complete: true; time: number })
```

This type allows:
- `complete: false` - Action is still being streamed (partial data)
- `complete: true` - Action is fully received
- `time` - Elapsed time since stream start (for UI feedback)

---

## Part 3: Frontend Streaming Reception

### 3.1 `streamAgent()` Function (`client/agent/TldrawAgent.ts`, lines 816-877)

Receives SSE stream and parses it:

```typescript
async function* streamAgent({
  prompt,
  signal,
}: {
  prompt: BaseAgentPrompt
  signal: AbortSignal
}): AsyncGenerator<Streaming<AgentAction>> {
  const res = await fetch('/stream', {
    method: 'POST',
    body: JSON.stringify(prompt),
    headers: { 'Content-Type': 'application/json' },
    signal,
  })

  if (!res.body) throw Error('No body in response')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      // Decode chunks
      buffer += decoder.decode(value, { stream: true })
      
      // Split by SSE separator
      const actions = buffer.split('\n\n')
      buffer = actions.pop() || ''

      for (const action of actions) {
        const match = action.match(/^data: (.+)$/m)
        if (match) {
          // Check for end signal
          if (match[1] === '[DONE]') break

          try {
            const data = JSON.parse(match[1])
            if ('error' in data) throw new Error(data.error)
            
            const agentAction: Streaming<AgentAction> = data
            yield agentAction
          } catch (err) {
            console.error('[TldrawAgent] Failed to parse action:', match[1])
            throw new Error(err.message)
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
```

**Key Points**:
- Uses ReadableStream API (modern Web standard)
- Buffers incoming chunks until complete SSE events arrive
- Parses `data: {json}\n\n` format
- Supports AbortController for cancellation
- Yields each action as it arrives

### 3.2 Request Agent Loop (`client/agent/TldrawAgent.ts`, lines 730-808)

Consumes the streamed actions and updates the canvas:

```typescript
function requestAgent({ agent, request }) {
  const controller = new AbortController()
  
  const requestPromise = (async () => {
    const prompt = await agent.preparePrompt(request, helpers)
    const actionPromises: Promise<void>[] = []
    
    try {
      // CONSUME STREAM
      for await (const action of streamAgent({ prompt, signal: controller.signal })) {
        if (cancelled) break
        
        editor.run(() => {
          // SANITIZE ACTION
          const actionUtil = agent.getAgentActionUtil(action._type)
          const transformedAction = actionUtil.sanitizeAction(action, helpers)
          if (!transformedAction) return

          // REVERT INCOMPLETE ACTION IF NEEDED
          if (incompleteDiff) {
            const inversePrevDiff = reverseRecordsDiff(incompleteDiff)
            editor.store.applyDiff(inversePrevDiff)
          }

          // APPLY ACTION
          const { diff, promise } = agent.act(transformedAction, helpers)
          if (promise) actionPromises.push(promise)

          // TRACK INCOMPLETE DIFFS FOR REVERTING
          if (transformedAction.complete) {
            incompleteDiff = null
          } else {
            incompleteDiff = diff
          }
        }, { ignoreShapeLock: false, history: 'ignore' })
      }
      
      await Promise.all(actionPromises)
    } catch (e) {
      agent.onError(e)
    }
  })()

  return { promise: requestPromise, cancel: () => controller.abort() }
}
```

**Smart Features**:
1. **Incremental Canvas Updates**: Canvas updates while action is still streaming (complete: false)
2. **Rollback on Update**: Previous incomplete diffs are reversed when new version arrives
3. **Batched Promises**: Async actions (animations) are tracked and awaited at end
4. **Cancellation**: AbortController allows user to stop the stream mid-request

---

## Part 4: Thinking/Reasoning UI Components

### 4.1 "Think" Action Type (`shared/actions/ThinkActionUtil.ts`)

Displays agent's reasoning process:

```typescript
const ThinkAction = z.object({
  _type: z.literal('think'),
  text: z.string(),
})

export class ThinkActionUtil extends AgentActionUtil<ThinkAction> {
  static override type = 'think' as const

  override getSchema() {
    return ThinkAction
  }

  override getInfo(action: Streaming<ThinkAction>) {
    const time = Math.floor(action.time / 1000)
    let summary = `Thought for ${time} seconds`
    if (time === 1) summary = 'Thought for 1 second'

    return {
      icon: 'brain' as const,
      description: action.text ?? (action.complete ? 'Thinking...' : null),
      summary,
    }
  }
}
```

**UI Rendering**:
- Icon: Brain icon from `BrainIcon.tsx`
- Text: Shows actual reasoning text when complete
- Shows "Thinking..." during incomplete streaming
- Summary: "Thought for X seconds" when collapsed

### 4.2 Message Action (`shared/actions/MessageActionUtil.ts`)

For AI responses to users:

```typescript
const MessageAction = z.object({
  _type: z.literal('message'),
  text: z.string(),
})

export class MessageActionUtil extends AgentActionUtil<MessageAction> {
  override getInfo(action: Streaming<MessageAction>) {
    return {
      description: action.text ?? '',
      canGroup: () => false,  // Don't group messages
    }
  }
}
```

### 4.3 Chat History Display (`client/components/chat-history/`)

**ChatHistory.tsx** - Main container:
```typescript
export function ChatHistory({ agent }) {
  const historyItems = useValue(agent.$chatHistory)
  const sections = getAgentHistorySections(historyItems)
  const isGenerating = useValue('isGenerating', () => agent.isGenerating())

  return (
    <div className="chat-history">
      {sections.map((section, i) => (
        <ChatHistorySection
          section={section}
          agent={agent}
          loading={i === sections.length - 1 && isGenerating}  // Show spinner on last section
        />
      ))}
    </div>
  )
}
```

**ChatHistorySection.tsx** - Groups actions by prompt:
```typescript
export function ChatHistorySection({ section, agent, loading }) {
  const actions = section.items.filter((item) => item.type === 'action')
  const groups = getActionHistoryGroups(actions, agent)
  
  return (
    <div className="chat-history-section">
      <ChatHistoryPrompt item={section.prompt} />
      {groups.map((group, i) => (
        <ChatHistoryGroup key={i} group={group} agent={agent} />
      ))}
      {loading && <SmallSpinner />}  {/* Spinner while streaming */}
    </div>
  )
}
```

**ChatHistoryGroup.tsx** - Renders action details:
```typescript
interface DiffStep {
  icon: AgentIconType | null
  description: string | null
}

function DiffSteps({ steps }: { steps: DiffStep[] }) {
  return (
    <div className="agent-changes">
      {steps.map((step) => (
        <div className="agent-change" key={...}>
          {step.icon && <AgentIcon type={step.icon} />}
          {step.description}
        </div>
      ))}
    </div>
  )
}
```

### 4.4 ChatHistoryInfo Type (`shared/types/ChatHistoryInfo.ts`)

Controls how each action displays:

```typescript
export interface ChatHistoryInfo {
  icon: AgentIconType | null           // Brain, create, delete, etc.
  description: string | null           // What the AI did or is thinking
  summary: string | null               // Collapsed view text
  canGroup(other: Streaming<BaseAgentAction>): boolean  // Group similar actions
}
```

---

## Part 5: Tool Calling Visualization

### 5.1 Action Types = "Tools"

Instead of explicit tool calling, tldraw-agent uses an "Action" system:

```
Available Actions (in shared/actions/):
├── CreateActionUtil.ts      → "Create shapes"
├── DeleteActionUtil.ts      → "Delete shapes"
├── MoveActionUtil.ts        → "Move shapes"
├── ResizeActionUtil.ts      → "Resize shapes"
├── MessageActionUtil.ts     → "Send message to user"
├── ThinkActionUtil.ts       → "Show reasoning"
├── ReviewActionUtil.ts      → "Review canvas"
├── TodoListActionUtil.ts    → "Create todo items"
└── [20+ more action types]
```

### 5.2 How Tool Calling Works

The AI returns JSON with action structure:

```json
{
  "actions": [
    {
      "_type": "think",
      "text": "The user wants me to create a snowman. I'll draw three circles..."
    },
    {
      "_type": "create",
      "shapeType": "ellipse",
      "x": 100,
      "y": 200,
      "w": 80,
      "h": 100
    },
    {
      "_type": "message",
      "text": "Created a snowman! It has three circles for the body."
    }
  ]
}
```

### 5.3 Real-time Visualization

As stream arrives with `complete: false`:
```typescript
{
  "_type": "create",
  "shapeType": "ellipse",
  "x": 100,           // Incomplete: partial shape being drawn
  "y": 200,
  "complete": false,
  "time": 250
}
```

UI shows:
```
🔵 Creating shape... (250ms elapsed)
```

When `complete: true` arrives:
```typescript
{
  "_type": "create",
  "shapeType": "ellipse",
  "x": 100,
  "y": 200,
  "w": 80,
  "h": 100,
  "complete": true,
  "time": 512
}
```

UI updates to:
```
🔵 Created ellipse (512ms)
[Visual preview of actual shape on canvas]
```

---

## Part 6: JSON Incremental Parsing

### Clever `closeAndParseJson()` Function (`worker/do/closeAndParseJson.ts`)

Handles incomplete JSON as stream arrives:

```
Stream chunk 1: {"actions": [{"_type": "
Stream chunk 2: "think", "text": "I'm
Stream chunk 3: thinking..."}, {"_type
...
```

The function:
1. Tracks opening/closing braces `{ [ "`
2. Closes all unclosed structures
3. Returns parsed object even if incomplete

Example:
```javascript
closeAndParseJson('{"actions": [{"_type":')
// Returns: { actions: [{ _type: '' }] }

closeAndParseJson('{"actions": [{"_type": "think", "text": "Analyzing')
// Returns: { actions: [{ _type: 'think', text: 'Analyzing' }] }
```

This allows parsing partially-complete JSON from streaming responses!

---

## Part 7: Comparison with Our Minifab Setup

### Our Current Architecture
```
Frontend: Next.js + React
Backend: FastAPI (Python)
Chat Agent: Pydantic AI
Streaming: ❌ NOT IMPLEMENTED
Thinking UI: ❌ NOT IMPLEMENTED
```

### TL;Draw Agent Architecture
```
Frontend: React + Vite
Backend: Express.js (Node.js)
Chat Agent: Vercel AI SDK
Streaming: ✅ Server-Sent Events (SSE)
Thinking UI: ✅ "Think" action type + visual icons
```

---

## Part 8: Implementation Recommendations for Minifab

### 8.1 Adapt SSE to FastAPI Backend

**File**: `backend/api/stream_router.py`

```python
from fastapi import APIRouter, Response
from fastapi.responses import StreamingResponse
import asyncio
import json

router = APIRouter()

@router.post("/api/stream")
async def stream_chat(request: ChatRequest):
    async def event_generator():
        try:
            # Get agent response stream (Pydantic AI)
            async for event in agent.stream(
                prompt=request.prompt,
                context_images=request.selected_images
            ):
                # Wrap in Streaming type
                streaming_event = {
                    **event.model_dump(),
                    "complete": event.is_final,
                    "time": time_elapsed_ms
                }
                
                # Send as SSE
                yield f"data: {json.dumps(streaming_event)}\n\n"
            
            # Signal completion
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
```

### 8.2 Frontend Hook to Consume Stream

**File**: `frontend/src/features/chat/hooks/useAgentStream.ts`

```typescript
export function useAgentStream() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentAction, setCurrentAction] = useState<StreamingAction | null>(null)

  const streamChat = useCallback(async (prompt: string) => {
    setIsStreaming(true)
    
    try {
      const response = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const match = line.match(/^data: (.+)$/)
          if (match && match[1] !== '[DONE]') {
            const action = JSON.parse(match[1])
            setCurrentAction(action)
            
            // Dispatch to chat store
            dispatch(addStreamingAction(action))
          }
        }
      }
    } finally {
      setIsStreaming(false)
    }
  }, [dispatch])

  return { streamChat, isStreaming, currentAction }
}
```

### 8.3 Add "Thinking" UI Component

**File**: `frontend/src/features/chat/components/ThinkingIndicator.tsx`

```typescript
export function ThinkingIndicator({ text, elapsed }: { text?: string; elapsed: number }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
      <BrainIcon className="w-4 h-4 text-blue-500 animate-pulse" />
      <div className="flex-1">
        <p className="text-sm text-gray-700">
          {text || 'Thinking...'}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Elapsed: {(elapsed / 1000).toFixed(1)}s
        </p>
      </div>
    </div>
  )
}
```

### 8.4 Streaming Event Types for Minifab

**File**: `shared/types/StreamingEvent.ts`

```typescript
export type StreamingEvent<T = any> =
  | (Partial<T> & { complete: false; time: number })
  | (T & { complete: true; time: number })

export interface AgentStreamEvent extends StreamingEvent {
  type: 'think' | 'generate_images' | 'combine_images' | 'message'
  data: Record<string, any>
}
```

### 8.5 Pydantic AI Integration Points

Modify `ConversationManager` in minifab to:

1. **Capture streaming events from Pydantic AI result_stream()**:
```python
async for event in model.result_stream(...):
    yield {
        "type": event.type,
        "data": event.model_dump(),
        "complete": False,  # Until final chunk
        "time": elapsed_ms
    }
```

2. **Handle tool results incrementally**:
```python
if event.type == "tool_call":
    # Send partial tool execution
    yield {
        "type": "tool_execution",
        "tool_name": event.tool_name,
        "status": "executing",
        "complete": False
    }
    
    # Execute tool and stream result
    result = await execute_tool(event.tool_name, event.args)
    yield {
        "type": "tool_execution", 
        "tool_name": event.tool_name,
        "result": result,
        "status": "completed",
        "complete": True
    }
```

---

## Part 9: Key Insights for Implementation

### Streaming Best Practices from TL;Draw Agent

1. **Start with JSON structure** - Force response to begin with `{"actions": [{"_type":` so partial objects always parse

2. **Use `complete` flag** - Distinguish between partial and complete events in UI

3. **Track elapsed time** - Show performance metrics (how long agent is "thinking")

4. **Support cancellation** - Use AbortController to let users stop long-running streams

5. **Handle incomplete actions** - Revert canvas changes when new version of streaming action arrives

6. **Graceful degradation** - If streaming fails, try regular request/response pattern

7. **Action grouping** - Group similar consecutive actions (multiple creates → "Created 3 shapes")

8. **Thought transparency** - Show "think" actions to users so they understand AI reasoning

---

## Part 10: File Reference Index

### Backend Core
- `/server/routes/stream.ts` - Express SSE endpoint
- `/worker/do/AgentService.ts` - Streaming logic with Vercel AI SDK
- `/worker/do/closeAndParseJson.ts` - Incremental JSON parser

### Frontend Core
- `/client/agent/TldrawAgent.ts` - Main agent class with `streamAgent()` function
- `/client/components/ChatPanel.tsx` - Chat UI container
- `/client/components/chat-history/ChatHistory.tsx` - History display
- `/client/components/chat-history/ChatHistorySection.tsx` - Action grouping
- `/client/components/chat-history/ChatHistoryGroup.tsx` - Individual action rendering

### Types & Utilities
- `/shared/types/Streaming.ts` - Streaming<T> type definition
- `/shared/types/ChatHistoryInfo.ts` - Action display info interface
- `/shared/actions/AgentActionUtil.ts` - Base class for action handlers
- `/shared/actions/ThinkActionUtil.ts` - Example: Thinking/reasoning action
- `/shared/actions/MessageActionUtil.ts` - Example: Message to user action

### Configuration
- `/package.json` - Dependencies (ai SDK v5.0.15, Vercel AI packages)
- `/worker/models.ts` - Model definitions (Anthropic, OpenAI, Google)

---

## Summary

The tldraw-agent demonstrates a production-ready streaming system that:
1. Uses SSE for real-time server→client communication
2. Parses incomplete JSON incrementally
3. Shows agent reasoning with "Think" actions
4. Provides incremental canvas updates before actions complete
5. Allows user cancellation mid-stream
6. Has a pluggable "Action" system instead of explicit tools

This architecture is directly applicable to minifab by adapting the Express backend to FastAPI SSE, integrating with Pydantic AI's result_stream(), and adding visual thinking/tool-calling indicators to the React frontend.

