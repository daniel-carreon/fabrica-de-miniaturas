# TL;Draw Agent - Architecture & Streaming Flow Diagrams

## Diagram 1: Complete Streaming Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ChatPanel Component                                                │
│  ├─ User enters: "Draw a snowman"                                   │
│  └─ Calls: agent.prompt({ message: "Draw a snowman" })             │
│                                ↓                                    │
│  TldrawAgent.prompt()                                               │
│  ├─ Prepares full prompt with context                              │
│  └─ Calls: requestAgent({ agent, request })                        │
│                                ↓                                    │
│  requestAgent() - Main streaming consumer                           │
│  ├─ Opens SSE connection to /stream                                 │
│  ├─ for await (const action of streamAgent()) {                     │
│  │   ├─ editor.run(() => {                                          │
│  │   │   ├─ Sanitize action                                         │
│  │   │   ├─ Revert incomplete diffs                                 │
│  │   │   ├─ Apply action to canvas                                  │
│  │   │   └─ Save diff for potential rollback                        │
│  │   └─ })                                                          │
│  └─ }                                                               │
│                                ↓                                    │
│  streamAgent() - SSE Parser (AsyncGenerator)                        │
│  ├─ Fetch('/stream', { POST, body: prompt })                        │
│  ├─ const reader = response.body.getReader()                        │
│  ├─ while (!done) {                                                 │
│  │   ├─ Decode chunk: "data: {json}\n\n"                            │
│  │   ├─ Parse JSON                                                  │
│  │   ├─ yield Streaming<AgentAction>                                │
│  │   └─ Continue reading                                            │
│  └─ }                                                               │
│                                ↓                                    │
│  ChatHistory Component - Real-time UI Update                        │
│  ├─ Watches: agent.$chatHistory                                     │
│  ├─ Shows:                                                          │
│  │   ├─ User prompt                                                 │
│  │   ├─ "Thinking..." (while action.complete = false)              │
│  │   ├─ Action icon + description                                   │
│  │   ├─ Canvas diff preview                                         │
│  │   └─ Accept/Reject buttons                                       │
│  └─ Auto-scrolls to bottom                                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                   ↑ ↓
┌─────────────────────────────────────────────────────────────────────┐
│                       NETWORK (SSE)                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  HTTP POST /stream                                                  │
│  ├─ Request body: AgentPrompt { messages, system, context... }      │
│  │                                                                  │
│  └─ Response (text/event-stream):                                   │
│     ├─ data: {"_type":"think","text":"","complete":false}          │
│     ├─ data: {"_type":"think","text":"Analyzing...","complete":... │
│     ├─ data: {"_type":"create","x":100,"y":200,"complete":false}   │
│     ├─ data: {"_type":"create","x":100,"y":200,"w":80,"h":100,...  │
│     ├─ data: {"_type":"message","text":"Created","complete":true}  │
│     └─ data: [DONE]                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                   ↑ ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Express.js)                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  streamHandler (POST /stream)                                       │
│  ├─ Set SSE headers:                                                │
│  │   ├─ Content-Type: text/event-stream                             │
│  │   ├─ Cache-Control: no-cache, no-transform                       │
│  │   ├─ Connection: keep-alive                                      │
│  │   └─ X-Accel-Buffering: no                                       │
│  │                                                                  │
│  ├─ Create AgentService instance                                    │
│  └─ for await (event of agentService.stream(prompt)) {              │
│       res.write(`data: ${JSON.stringify(event)}\n\n`)               │
│     }                                                               │
│                                ↓                                    │
│  AgentService.stream() (AsyncGenerator)                             │
│  ├─ Get model (Anthropic/OpenAI/Google)                             │
│  └─ for await (event of streamActions(model, prompt)) {             │
│       yield event                                                   │
│     }                                                               │
│                                ↓                                    │
│  streamActions() - JSON Parser (Core Logic)                         │
│  ├─ Start message with: {"actions": [{"_type":                      │
│  │   (Forces model to output valid JSON start)                      │
│  │                                                                  │
│  ├─ const { textStream } = streamText({                             │
│  │   model,                                                         │
│  │   system: systemPrompt,                                          │
│  │   messages: [... with prefilled start ...],                      │
│  │   providerOptions: { thinking config... }                        │
│  │ })                                                               │
│  │                                                                  │
│  └─ for await (const text of textStream) {                          │
│       ├─ buffer += text                                             │
│       ├─ const obj = closeAndParseJson(buffer)                      │
│       │  (Handles incomplete JSON!)                                 │
│       │                                                             │
│       ├─ if (obj.actions.length > cursor) {                         │
│       │   yield completed action with complete: true                │
│       │   cursor++                                                  │
│       │ }                                                           │
│       │                                                             │
│       └─ yield incomplete action with complete: false               │
│     }                                                               │
│                                ↓                                    │
│  Vercel AI SDK (streamText)                                         │
│  ├─ Calls chosen model's streaming API                              │
│  ├─ Returns textStream AsyncIterable                                │
│  └─ Each chunk is partial text (as it arrives)                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Diagram 2: Streaming Event Timeline

```
Time    Frontend              SSE Wire            Backend
────    ────────              ────────            ───────
  0ms   Send prompt        ──────────→  Receive prompt
         (start streaming)              Parse → startTime = 0
                                        
 50ms                                   buffer = '{"actions": [{"_type":'
                                        chunk = '"think",'
                                        closeAndParseJson() → incomplete
                                        yield { complete: false, time: 50 }
                           ←──────────   data: {...,complete:false,time:50}\n\n
        
        Receive event       
        action.complete=false
        Update ChatHistory:
        "Thinking..." ← Display brain icon
        
150ms                                   buffer = '..."text":"I see a..."'
                                        closeAndParseJson() → incomplete
                                        yield { complete: false, time: 150 }
                           ←──────────   data: {...,"text":"I see...","complete":false,...}\n\n
        
        Receive event
        Update ChatHistory:
        "Thinking... I see a..."  ← Show partial text
        
250ms                                   buffer = '..."},'  ← NEW action starts
                                        obj.actions[0] is complete!
                                        yield previous with complete: true
                                        yield new action with complete: false
                           ←──────────   data: {...complete:true,time:250}\n\n
                           ←──────────   data: {...create action...,complete:false,...}\n\n
        
        Receive think action (complete: true)
        Update ChatHistory:
        "Thinking completed" ← Keep text, mark as done
        
        Receive create action (complete: false)
        editor.run(() => {
          Apply partial shape to canvas
          Save diff
        })
        Update ChatHistory:
        "Creating shape..."
        
350ms                                   closeAndParseJson() → obj has full create shape
                                        yield with complete: true
                           ←──────────   data: {...,"complete":true,...}\n\n
        
        Receive create (complete: true)
        editor.run(() => {
          Revert previous incomplete diff
          Apply complete shape
        })
        Update ChatHistory:
        "Created ellipse" with preview
        
450ms                                   obj.actions[2] arrives
                                        (message action)
                                        yield with complete: false
                           ←──────────   data: {type:message,...,complete:false}\n\n
        
        Update ChatHistory:
        "Sending message..." (if streaming)
        
500ms                                   Final text arrives
                                        obj.actions[2] complete
                           ←──────────   data: {type:message,...,text:"Done!",complete:true}\n\n
        
        Update ChatHistory:
        "Done!" (message complete)
        
510ms                                   yield final action
                                        return from async generator
                           ←──────────   data: [DONE]\n\n
        
        Stream ends
        reader.releaseLock()
        Promise resolves
```

---

## Diagram 3: Action State Management

```
┌──────────────────────────────────────────────────────────┐
│ Streaming<AgentAction> State Machine                     │
└──────────────────────────────────────────────────────────┘

Initial:
{
  _type: "think"
  complete: false       ← Starting to think
  time: 0
}
    ↓
(Buffer accumulates text)
    ↓
{
  _type: "think"
  text: "I need to..."
  complete: false       ← Still thinking
  time: 150
}
    ↓
(More text arrives)
    ↓
{
  _type: "think"
  text: "I need to create a snowman with three circles"
  complete: false       ← More text
  time: 250
}
    ↓
(JSON parsing completes for this action)
    ↓
{
  _type: "think"
  text: "I need to create a snowman with three circles"
  complete: true        ← FINAL STATE for this action
  time: 280
}
    ↓ (Next action begins)
    ↓
{
  _type: "create"
  complete: false       ← New action starts
  time: 300
}
    ↓ (Shape parameters arrive)
    ↓
{
  _type: "create"
  shapeType: "ellipse"
  x: 100
  y: 200
  complete: false       ← Still building
  time: 320
}
    ↓ (Width/height arrive)
    ↓
{
  _type: "create"
  shapeType: "ellipse"
  x: 100
  y: 200
  w: 80
  h: 100
  complete: true        ← FINAL
  time: 350
}

Key Insight:
- complete: false = PARTIAL (subscribe to updates)
- complete: true = FINAL (action is done, won't change)
- time = Elapsed since stream start (useful for UI: "Thinking for 280ms")
```

---

## Diagram 4: Chat History Structure

```
┌─────────────────────────────────────────────────────────┐
│ agent.$chatHistory: ChatHistoryItem[]                   │
└─────────────────────────────────────────────────────────┘

Initial: []

After user submits "Draw a snowman":
[
  { 
    type: 'prompt',
    message: 'Draw a snowman',
    contextItems: [],
    selectedShapes: []
  }
]
    ↓ (Stream starts arriving)
    ↓
[
  { type: 'prompt', ... },
  {
    type: 'action',
    action: { _type: 'think', text: 'I see...', complete: false, time: 150 },
    diff: {},  ← Canvas changes for this action
    acceptance: 'pending'
  }
]
    ↓ (Think action completes, create action starts)
    ↓
[
  { type: 'prompt', ... },
  {
    type: 'action',
    action: { _type: 'think', text: '...snowman...', complete: true, time: 280 },
    diff: {},
    acceptance: 'pending'
  },
  {
    type: 'action',
    action: { _type: 'create', x: 100, y: 200, ..., complete: false, time: 300 },
    diff: { added: { shapes: [circle1] }, ... },
    acceptance: 'pending'
  }
]
    ↓ (Stream ends)
    ↓
[
  { type: 'prompt', ... },
  { type: 'action', action: { _type: 'think', ..., complete: true }, ... },
  { type: 'action', action: { _type: 'create', ..., complete: true }, ... },
  { type: 'action', action: { _type: 'create', ..., complete: true }, ... },
  { type: 'action', action: { _type: 'create', ..., complete: true }, ... },
  { type: 'action', action: { _type: 'message', text: 'Done!', complete: true }, ... }
]

User interactions:
  ├─ Can Accept group → acceptance: 'accepted'
  ├─ Can Reject group → acceptance: 'rejected'
  │                      (diffs are reverted from canvas)
  └─ Keeps full history even after accept/reject
```

---

## Diagram 5: JSON Parsing Strategy

```
┌──────────────────────────────────────────────┐
│ Incomplete JSON Parsing Flow                 │
└──────────────────────────────────────────────┘

Backend forces response start:
  messages.push({
    role: 'assistant',
    content: '{"actions": [{"_type":'  ← Guarantee valid start
  })

Model continues from there:
  Model output: "think", "text": "analyzing the request"
  
  Full: {"actions": [{"_type": "think", "text": "analyzing the request"...

Frontend receives in chunks:
┌─ Chunk 1: {"actions": [{"_type":
│  buffer = '{"actions": [{"_type":'
│  closeAndParseJson() tries to parse
│  Closes: {"actions": [{"_type":""}]}  ← Synthetic closing
│  result: { actions: [{ _type: "" }] }
│  YIELDS INCOMPLETE ACTION
│
├─ Chunk 2: "think", "text": "an
│  buffer = '{"actions": [{"_type": "think", "text": "an'
│  closeAndParseJson():
│    - Tracks: " { [ { "
│    - Closes: "an"}]}
│    - Result: { actions: [{ _type: 'think', text: 'an' }] }
│  YIELDS INCOMPLETE ACTION
│
├─ Chunk 3: alyz
│  buffer = '...text": "analyz'
│  closeAndParseJson(): { actions: [{ _type: 'think', text: 'analyz' }] }
│  YIELDS INCOMPLETE ACTION
│
├─ Chunk 4: ing the request"}, {"_type": "create"
│  buffer complete!
│  closeAndParseJson(): { actions: [
│    { _type: 'think', text: 'analyzing the request' },
│    { _type: 'create' }  ← NEW ACTION DETECTED!
│  ]}
│  First action is now COMPLETE (length increased)
│  YIELD PREVIOUS with complete: true
│  YIELD NEW with complete: false
│
└─ Chunk 5: , "x": 100, "y": 200, "w": 80, "h": 100}]}
   buffer complete
   closeAndParseJson(): full final object
   First two actions complete
   YIELD both with complete: true

Key Algorithm (closeAndParseJson):
  1. Track opening { [ "
  2. Track closing } ] "
  3. Add missing closings at end
  4. JSON.parse() result
  5. Return null if parse fails

This allows:
  - Partial field values
  - Partial nested objects
  - Partial arrays
  - All gracefully handled
```

---

## Diagram 6: Incremental Canvas Updates

```
User Action: "Draw a snowman"
    ↓
Model thinks about geometry
    ↓
Sends create action with x, y but no w, h yet
    ├─ complete: false
    └─ Canvas UPDATE 1: Show partial shape
       (Just a point, or small circle)
    ↓
Model thinks more about size
    ↓
Sends create with x, y, w, h complete
    ├─ complete: true
    ├─ Canvas UPDATE 2: Revert UPDATE 1
    │                   Apply complete shape
    │                   (Full circle with correct size)
    └─ Preview shows final shape
    ↓
Repeat for 2nd circle
    ├─ Create 2: partial
    ├─ Canvas UPDATE 3: Show small circle
    ├─ Create 2: complete
    ├─ Canvas UPDATE 4: Revert, show correct circle
    └─ Preview shows 2 circles
    ↓
Repeat for 3rd circle
    ├─ Create 3: partial → Canvas UPDATE 5
    ├─ Create 3: complete → Canvas UPDATE 6
    └─ Preview shows 3 circles
    ↓
Message action sent
    ├─ complete: true
    └─ Chat shows: "Done! Created a snowman"

User can:
  ├─ Accept all changes
  └─ Reject all changes
      └─ Applies reverseRecordsDiff for each action's diff
```

---

## Diagram 7: Vercel AI SDK Integration

```
┌─────────────────────────────────────────────┐
│ How Vercel AI SDK Enables Streaming         │
└─────────────────────────────────────────────┘

Old way (non-streaming):
  const response = await model.generate(prompt)
  return response.text  ← Waits for full response

TL;Draw way (streaming):
  const { textStream } = streamText({
    model,           ← Any LLM (Claude, GPT, Gemini, etc)
    system,
    messages,
    maxOutputTokens,
    temperature,
    providerOptions: {
      anthropic: { thinking: { type: 'disabled' } },
      google: { thinkingConfig: { thinkingBudget: 128 } }
    }
  })

  for await (const text of textStream) {
    ← Chunks arrive as they're generated
    ← Can process before full response
  }

Key Benefits:
  ├─ Text is streamed character-by-character
  ├─ Can parse JSON incrementally
  ├─ Model provider abstraction (swap models easily)
  ├─ Built-in thinking support (Anthropic extended thinking)
  ├─ Standardized response format
  └─ Error handling built-in

For minifab (Python):
  Can't use Vercel SDK (JS only)
  Use: Pydantic AI result_stream() instead
  
  from pydantic_ai import Agent
  
  async for event in agent.run_stream(prompt):
    - Similar async generator pattern
    - Yields partial results
    - Can wrap in SSE same way
```

---

## Diagram 8: Frontend-Backend Comparison

```
ARCHITECTURE COMPARISON

TL;Draw Agent:
┌──────────────┐     ┌──────────────────┐      ┌───────────┐
│React + Vite  │────→│Express.js + Node │────→│ Vercel AI │
│              │ SSE │                  │      │    SDK    │
│              │←────│  + Durable Obj   │      │ (Streaming)
└──────────────┘     └──────────────────┘      └───────────┘
  (All TypeScript)     (All TypeScript)         (Abstracted)

Minifab:
┌──────────────┐     ┌──────────────────┐      ┌───────────┐
│Next.js React │────→│FastAPI (Python)  │────→│Pydantic AI│
│              │ SSE │                  │      │ (Streaming)
│              │←────│ ConversationMgr  │      │ (Python)  │
└──────────────┘     └──────────────────┘      └───────────┘
  (TypeScript)       (Python)                  (Python)

SSE is the bridge layer:
┌─────────────────────────────────────────────────────────┐
│ Frontend doesn't care about model framework              │
│ Backend doesn't care about frontend framework            │
│ They communicate via standard SSE format:               │
│                                                         │
│  data: {"_type":"think","text":"...","complete":false}  │
│  data: {"_type":"tool","name":"...","complete":false}   │
│  data: [DONE]                                           │
│                                                         │
│ This is why it works across different stacks!           │
└─────────────────────────────────────────────────────────┘
```

