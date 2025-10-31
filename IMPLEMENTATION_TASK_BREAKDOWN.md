# IMPLEMENTATION TASK BREAKDOWN - STREAMING CHAT AGENT

## 🎯 EXECUTION STRATEGY

**Methodology:** Sequential execution with validation gates. NO task can be started until the previous task's validation criteria are 100% met.

**Total Estimated Time:** 15-20 hours
**Phases:** 4 main phases, 47 total tasks
**Current Status:** Ready to begin Phase 1

---

## 📋 PHASE 1: BACKEND STREAMING FOUNDATION

**Goal:** Create SSE streaming endpoint with Anthropic SDK
**Estimated Time:** 4-6 hours
**Prerequisites:** None (clean slate)

### Task 1.1: Install Anthropic SDK
**Priority:** P0 (Blocking)
**Time:** 10 minutes

**Actions:**
```bash
cd backend
pip install anthropic
echo "anthropic>=0.40.0" >> requirements.txt
pip freeze | grep anthropic  # Verify installation
```

**Validation Criteria:**
- [ ] `pip list | grep anthropic` shows `anthropic 0.40.0` or higher
- [ ] `python -c "import anthropic; print(anthropic.__version__)"` executes without error
- [ ] requirements.txt contains `anthropic>=0.40.0`

**Rollback Plan:**
```bash
pip uninstall anthropic -y
git restore requirements.txt
```

---

### Task 1.2: Add ANTHROPIC_API_KEY to environment
**Priority:** P0 (Blocking)
**Time:** 5 minutes
**Prerequisites:** Task 1.1 complete

**Actions:**
```bash
# Add to backend/.env
echo "ANTHROPIC_API_KEY=your_key_here" >> .env

# Verify
python -c "from dotenv import load_dotenv; import os; load_dotenv(); print('ANTHROPIC_API_KEY:', os.getenv('ANTHROPIC_API_KEY')[:10] + '...')"
```

**Validation Criteria:**
- [ ] `.env` file contains `ANTHROPIC_API_KEY=...`
- [ ] Key is at least 40 characters long
- [ ] Key starts with `sk-ant-`
- [ ] Test API call succeeds:
```python
import anthropic
import os
from dotenv import load_dotenv

load_dotenv()
client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))
message = client.messages.create(
    model="claude-sonnet-4.5-20250929",
    max_tokens=10,
    messages=[{"role": "user", "content": "Hi"}]
)
print("✅ Anthropic API working:", message.content[0].text)
```

**Rollback Plan:**
```bash
# Remove key from .env
sed -i '' '/ANTHROPIC_API_KEY/d' .env
```

---

### Task 1.3: Create chat_streaming_router.py skeleton
**Priority:** P0 (Blocking)
**Time:** 30 minutes
**Prerequisites:** Task 1.1, 1.2 complete

**Actions:**
```bash
touch backend/api/chat_streaming_router.py
```

**File Content:**
```python
"""
Streaming Chat Router - SSE Implementation with Anthropic SDK
"""
import json
import time
import logging
from typing import AsyncGenerator, List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import anthropic
import os
from dotenv import load_dotenv

from api.chat_router import ChatRequest, ChatMessage, SelectedImage, UserImageConfig

load_dotenv()
logger = logging.getLogger(__name__)
router = APIRouter()

# Anthropic client
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY not found in environment")

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

def sse_event(event_type: str, data: dict) -> str:
    """Format Server-Sent Event"""
    return f"data: {json.dumps({'type': event_type, **data})}\n\n"

async def event_generator(request: ChatRequest) -> AsyncGenerator[str, None]:
    """Generate SSE events for streaming chat"""
    try:
        # Send start event
        yield sse_event('start', {
            'timestamp': time.time(),
            'conversation_id': request.conversation_id if hasattr(request, 'conversation_id') else None
        })

        # Send thinking event
        yield sse_event('thinking', {
            'step': 'analyzing',
            'message': 'Understanding your request...',
            'elapsed_ms': 0
        })

        # TODO: Build messages array
        # TODO: Build tools array
        # TODO: Stream with Anthropic SDK
        # TODO: Handle tool calls
        # TODO: Send completion event

        # Placeholder complete event
        yield sse_event('complete', {
            'final_response': 'Streaming implementation in progress',
            'usage': {},
            'model': 'claude-sonnet-4.5-20250929'
        })

    except Exception as e:
        logger.error(f"Stream error: {e}", exc_info=True)
        yield sse_event('error', {
            'error': str(e),
            'recoverable': False
        })

@router.post("/chat/stream")
async def chat_stream_endpoint(request: ChatRequest):
    """
    SSE streaming endpoint with real-time thinking and tool calling visualization.

    Events emitted:
    - start: Stream initialization
    - thinking: AI reasoning phase
    - text_delta: Incremental text chunks
    - tool_call_start: Tool execution beginning
    - tool_call_result: Tool execution result
    - complete: Stream finished
    - error: Error occurred
    """
    return StreamingResponse(
        event_generator(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Nginx: disable buffering
        }
    )
```

**Validation Criteria:**
- [ ] File `backend/api/chat_streaming_router.py` exists
- [ ] File imports successfully: `python -c "from api.chat_streaming_router import router"`
- [ ] No syntax errors
- [ ] Router variable is defined
- [ ] sse_event function formats correctly:
```python
from api.chat_streaming_router import sse_event
event = sse_event('test', {'key': 'value'})
assert event == 'data: {"type":"test","key":"value"}\n\n'
```

**Rollback Plan:**
```bash
rm backend/api/chat_streaming_router.py
```

---

### Task 1.4: Register streaming router in main.py
**Priority:** P0 (Blocking)
**Time:** 5 minutes
**Prerequisites:** Task 1.3 complete

**Actions:**
Edit `backend/main.py`, add after existing router registrations:
```python
from api.chat_streaming_router import router as chat_streaming_router

app.include_router(chat_streaming_router, prefix="/api", tags=["chat-streaming"])
```

**Validation Criteria:**
- [ ] `main.py` imports `chat_streaming_router`
- [ ] Router is registered with `app.include_router`
- [ ] Backend starts without errors: `python -m uvicorn main:app --port 8001`
- [ ] OpenAPI docs show `/api/chat/stream` endpoint: http://localhost:8001/docs
- [ ] Endpoint accepts POST requests (test with curl)

**Validation Command:**
```bash
# Start backend
python -m uvicorn main:app --port 8001 &
sleep 3

# Test endpoint exists
curl -X POST http://localhost:8001/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"test","messages":[]}' \
  | head -20

# Should see SSE events streaming
```

**Rollback Plan:**
```bash
# Remove import and registration from main.py
git restore backend/main.py
```

---

### Task 1.5: Implement message building logic
**Priority:** P1 (High)
**Time:** 20 minutes
**Prerequisites:** Task 1.4 complete

**Actions:**
Add to `chat_streaming_router.py`:
```python
def build_messages(request: ChatRequest) -> List[Dict[str, Any]]:
    """Build messages array for Anthropic API"""
    messages = []

    # Add conversation history (last 10 messages to prevent context overflow)
    for msg in request.messages[-10:]:
        messages.append({
            "role": msg.role,
            "content": msg.content
        })

    # Add current user message
    user_content = []

    # Add text
    user_content.append({
        "type": "text",
        "text": request.message
    })

    # Add selected images (if any)
    if request.selectedImages:
        for img in request.selectedImages[:8]:  # Max 8 images
            user_content.append({
                "type": "image",
                "source": {
                    "type": "url",
                    "url": img.url
                }
            })

    # Add pasted images (if any)
    if request.pastedImages:
        for base64_img in request.pastedImages[:4]:  # Max 4 pasted
            user_content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/jpeg",
                    "data": base64_img.split(',')[1] if ',' in base64_img else base64_img
                }
            })

    messages.append({
        "role": "user",
        "content": user_content
    })

    return messages
```

**Validation Criteria:**
- [ ] Function builds messages correctly for text-only input
- [ ] Function handles conversation history (test with 15 messages, should keep last 10)
- [ ] Function adds selected images correctly
- [ ] Function adds pasted images correctly
- [ ] Function handles edge cases (empty messages, no images, etc.)

**Validation Test:**
```python
from api.chat_streaming_router import build_messages
from api.chat_router import ChatRequest, ChatMessage, SelectedImage

# Test 1: Text only
request = ChatRequest(message="hello", messages=[])
msgs = build_messages(request)
assert len(msgs) == 1
assert msgs[0]["role"] == "user"
assert msgs[0]["content"][0]["text"] == "hello"

# Test 2: With history
request = ChatRequest(
    message="follow up",
    messages=[ChatMessage(id="1", role="user", content="first", timestamp="2025-01-01")]
)
msgs = build_messages(request)
assert len(msgs) == 2

# Test 3: With images
request = ChatRequest(
    message="describe",
    messages=[],
    selectedImages=[SelectedImage(id="1", url="https://example.com/img.jpg", source="generated")]
)
msgs = build_messages(request)
assert len(msgs[0]["content"]) == 2  # text + image

print("✅ build_messages validation passed")
```

**Rollback Plan:**
```bash
# Remove function from file
git restore backend/api/chat_streaming_router.py
```

---

### Task 1.6: Implement tools building logic
**Priority:** P1 (High)
**Time:** 30 minutes
**Prerequisites:** Task 1.5 complete

**Actions:**
Add to `chat_streaming_router.py`:
```python
from system_prompts.agent_system_prompt import AGENT_SYSTEM_PROMPT

def build_tools() -> List[Dict[str, Any]]:
    """Build tools array for Anthropic API (same as chat_router.py)"""
    return [
        {
            "name": "generate_avatar",
            "description": """Generate personalized DANI identity images using fine-tuned Flux model.

USE WHEN:
- User mentions "DANI" explicitly
- Personal portraits, avatars, profile pictures
- YouTube thumbnails featuring DANI
- Tech reviewer scenarios with DANI

TRIGGER WORD: "DANI" must appear in user request.""",
            "input_schema": {
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "Detailed prompt including DANI and scene description"
                    },
                    "numImages": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 10,
                        "description": "Number of variations (AI decides based on request, default 1)"
                    },
                    "style": {
                        "type": "string",
                        "enum": ["photorealistic", "artistic", "cinematic", "portrait"],
                        "description": "Visual style"
                    }
                },
                "required": ["prompt"]
            }
        },
        {
            "name": "create_images",
            "description": """Create general images from scratch WITHOUT specific person identity.

USE WHEN:
- NO "DANI" mention in user request
- Generic graphics, artwork, illustrations
- Landscapes, cityscapes, objects, scenes""",
            "input_schema": {
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "Detailed description of what to create"
                    },
                    "numImages": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 5,
                        "description": "Number of variations"
                    },
                    "style": {
                        "type": "string",
                        "enum": ["photorealistic", "artistic", "cinematic", "abstract"],
                        "description": "Visual style"
                    }
                },
                "required": ["prompt"]
            }
        },
        {
            "name": "combine_images",
            "description": """Combine 2-8 existing images from the gallery using Nano Banana AI.

USE WHEN:
- User has selectedImages in context (2-8 images)
- User says "combina", "mezcla", "fusiona", "une"
- Creating thumbnails FROM existing images""",
            "input_schema": {
                "type": "object",
                "properties": {
                    "image_urls": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "URLs of images to combine (from selectedImages)"
                    },
                    "prompt": {
                        "type": "string",
                        "description": "How to combine them"
                    },
                    "output_style": {
                        "type": "string",
                        "enum": ["natural", "artistic", "collage"],
                        "description": "Combination style"
                    }
                },
                "required": ["image_urls", "prompt"]
            }
        }
    ]

def build_system_prompt(request: ChatRequest) -> str:
    """Build system prompt with context"""
    prompt_parts = [AGENT_SYSTEM_PROMPT]

    # Add selected images context
    if request.selectedImages:
        prompt_parts.append(f"\n\n🖼️ USER HAS SELECTED {len(request.selectedImages)} IMAGES:")
        for i, img in enumerate(request.selectedImages, 1):
            prompt_parts.append(f"{i}. {img.url} (source: {img.source})")

    # Add user config context
    if request.userConfig:
        prompt_parts.append(f"\n\n⚙️ USER PREFERENCES:")
        prompt_parts.append(f"- Temperature: {request.userConfig.temperature}")
        prompt_parts.append(f"- Style: {request.userConfig.style_preset}")
        prompt_parts.append(f"- Mood: {request.userConfig.mood}")

    return "\n".join(prompt_parts)
```

**Validation Criteria:**
- [ ] `build_tools()` returns list of 3 tools
- [ ] Each tool has name, description, input_schema
- [ ] Tool schemas match Anthropic API format
- [ ] `build_system_prompt()` includes base prompt
- [ ] System prompt includes selected images context (if any)
- [ ] System prompt includes user config context (if any)

**Validation Test:**
```python
from api.chat_streaming_router import build_tools, build_system_prompt

# Test tools
tools = build_tools()
assert len(tools) == 3
assert tools[0]["name"] == "generate_avatar"
assert "input_schema" in tools[0]

# Test system prompt
request = ChatRequest(message="test", messages=[])
prompt = build_system_prompt(request)
assert len(prompt) > 100
assert "DANI" in prompt

# With images
request.selectedImages = [SelectedImage(id="1", url="http://ex.com/img.jpg", source="gen")]
prompt = build_system_prompt(request)
assert "SELECTED" in prompt
assert "http://ex.com/img.jpg" in prompt

print("✅ build_tools validation passed")
```

**Rollback Plan:**
```bash
git restore backend/api/chat_streaming_router.py
```

---

### Task 1.7: Implement Anthropic SDK streaming
**Priority:** P0 (Blocking)
**Time:** 60 minutes
**Prerequisites:** Task 1.5, 1.6 complete

**Actions:**
Update `event_generator` function in `chat_streaming_router.py`:
```python
async def event_generator(request: ChatRequest) -> AsyncGenerator[str, None]:
    """Generate SSE events for streaming chat"""
    start_time = time.time()

    try:
        # Send start event
        yield sse_event('start', {
            'timestamp': start_time,
            'conversation_id': getattr(request, 'conversation_id', None)
        })

        # Build context
        messages = build_messages(request)
        tools = build_tools()
        system_prompt = build_system_prompt(request)

        logger.info(f"🚀 Starting stream with {len(messages)} messages, {len(tools)} tools")

        # Send thinking event
        yield sse_event('thinking', {
            'step': 'analyzing',
            'message': 'Understanding your request...',
            'elapsed_ms': int((time.time() - start_time) * 1000)
        })

        # Stream with Anthropic SDK
        full_response = ""
        tool_use_blocks = []

        with client.messages.stream(
            model="claude-sonnet-4.5-20250929",
            max_tokens=5000,
            system=system_prompt,
            messages=messages,
            tools=tools,
            temperature=0.7
        ) as stream:
            # Process stream events
            for text in stream.text_stream:
                full_response += text
                yield sse_event('text_delta', {
                    'content': text,
                    'index': len(full_response)
                })

            # Get final message
            final_message = stream.get_final_message()

            # Check for tool use
            for block in final_message.content:
                if block.type == "tool_use":
                    tool_use_blocks.append(block)

                    # Send tool call start event
                    yield sse_event('tool_call_start', {
                        'tool_name': block.name,
                        'tool_id': block.id,
                        'tool_args': block.input
                    })

            # Execute tools if any
            if tool_use_blocks:
                for tool_block in tool_use_blocks:
                    # Send executing event
                    yield sse_event('tool_executing', {
                        'tool_name': tool_block.name,
                        'tool_id': tool_block.id,
                        'status': 'running'
                    })

                    # Execute tool (import from chat_router)
                    from api.chat_router import call_generate_api, call_create_images_api, call_combine_images_api_multi

                    try:
                        if tool_block.name == "generate_avatar":
                            result = await call_generate_api(
                                prompt=tool_block.input.get('prompt'),
                                num_images=tool_block.input.get('numImages', 1),
                                user_config=request.userConfig
                            )
                        elif tool_block.name == "create_images":
                            result = await call_create_images_api(
                                prompt=tool_block.input.get('prompt'),
                                num_images=tool_block.input.get('numImages', 1)
                            )
                        elif tool_block.name == "combine_images":
                            result = await call_combine_images_api_multi(
                                image_urls=tool_block.input.get('image_urls'),
                                prompt=tool_block.input.get('prompt')
                            )
                        else:
                            result = {"error": f"Unknown tool: {tool_block.name}"}

                        # Send tool result event
                        yield sse_event('tool_call_result', {
                            'tool_id': tool_block.id,
                            'tool_name': tool_block.name,
                            'result': result
                        })

                    except Exception as tool_error:
                        logger.error(f"Tool execution failed: {tool_error}")
                        yield sse_event('tool_call_result', {
                            'tool_id': tool_block.id,
                            'tool_name': tool_block.name,
                            'error': str(tool_error)
                        })

        # Send completion event
        elapsed_ms = int((time.time() - start_time) * 1000)
        yield sse_event('complete', {
            'final_response': full_response,
            'tool_used': tool_use_blocks[0].name if tool_use_blocks else None,
            'usage': {
                'input_tokens': final_message.usage.input_tokens,
                'output_tokens': final_message.usage.output_tokens
            },
            'model': 'claude-sonnet-4.5-20250929',
            'elapsed_ms': elapsed_ms
        })

    except Exception as e:
        logger.error(f"Stream error: {e}", exc_info=True)
        yield sse_event('error', {
            'error': str(e),
            'recoverable': False
        })
```

**Validation Criteria:**
- [ ] Stream starts and sends 'start' event
- [ ] 'thinking' event sent before first text
- [ ] Text chunks stream incrementally (verify with curl)
- [ ] Tool calls detected and executed
- [ ] Tool results returned in stream
- [ ] 'complete' event sent at end
- [ ] Error handling works (test with invalid input)

**Validation Command:**
```bash
# Test text-only streaming
curl -N -X POST http://localhost:8001/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"Write a haiku about streaming","messages":[]}' \
  | head -50

# Expected output:
# data: {"type":"start",...}
# data: {"type":"thinking",...}
# data: {"type":"text_delta","content":"In"}
# data: {"type":"text_delta","content":" real"}
# data: {"type":"text_delta","content":"-time"}
# ...
# data: {"type":"complete",...}
```

**Rollback Plan:**
```bash
git restore backend/api/chat_streaming_router.py
```

---

### Task 1.8: Add proper error handling
**Priority:** P1 (High)
**Time:** 20 minutes
**Prerequisites:** Task 1.7 complete

**Actions:**
Add error handling wrappers in `chat_streaming_router.py`:
```python
import asyncio
from anthropic import APIError, APITimeoutError, RateLimitError

async def event_generator(request: ChatRequest) -> AsyncGenerator[str, None]:
    """Generate SSE events with comprehensive error handling"""
    start_time = time.time()

    try:
        # ... existing code ...

    except APITimeoutError as e:
        logger.error(f"Anthropic API timeout: {e}")
        yield sse_event('error', {
            'error': 'Request timed out. Please try again.',
            'recoverable': True,
            'error_type': 'timeout'
        })

    except RateLimitError as e:
        logger.error(f"Rate limit exceeded: {e}")
        yield sse_event('error', {
            'error': 'Rate limit exceeded. Please wait a moment.',
            'recoverable': True,
            'error_type': 'rate_limit',
            'retry_after': 60
        })

    except APIError as e:
        logger.error(f"Anthropic API error: {e}")
        yield sse_event('error', {
            'error': f'API error: {str(e)}',
            'recoverable': False,
            'error_type': 'api_error'
        })

    except Exception as e:
        logger.error(f"Unexpected stream error: {e}", exc_info=True)
        yield sse_event('error', {
            'error': f'Unexpected error: {str(e)}',
            'recoverable': False,
            'error_type': 'unknown'
        })
```

**Validation Criteria:**
- [ ] Timeout errors are caught and returned gracefully
- [ ] Rate limit errors include retry_after
- [ ] API errors are logged with full traceback
- [ ] Unknown errors don't crash the server
- [ ] Error events follow SSE format

**Validation Test:**
```python
# Test timeout handling (simulate with short timeout)
# Test rate limit (use invalid API key to trigger error)
# Test malformed request
```

**Rollback Plan:**
```bash
git restore backend/api/chat_streaming_router.py
```

---

### Task 1.9: Add logging and monitoring
**Priority:** P2 (Medium)
**Time:** 15 minutes
**Prerequisites:** Task 1.8 complete

**Actions:**
Add structured logging throughout `chat_streaming_router.py`:
```python
logger.info(f"📨 Stream request: message_length={len(request.message)}, history_size={len(request.messages)}, selected_images={len(request.selectedImages) if request.selectedImages else 0}")

logger.info(f"🧠 Thinking phase started (elapsed: {elapsed_ms}ms)")

logger.info(f"📝 Text delta sent: {len(text)} chars (total: {len(full_response)})")

logger.info(f"🔧 Tool call detected: {tool_block.name}")

logger.info(f"✅ Tool executed successfully: {tool_block.name} (result_size: {len(str(result))})")

logger.info(f"✨ Stream complete: {elapsed_ms}ms total, {len(full_response)} chars, {len(tool_use_blocks)} tools used")
```

**Validation Criteria:**
- [ ] Logs appear in console during streaming
- [ ] Logs include timestamps
- [ ] Logs include context (message length, tools used, etc.)
- [ ] Error logs include stack traces

**Rollback Plan:**
```bash
git restore backend/api/chat_streaming_router.py
```

---

### Task 1.10: Test end-to-end backend streaming
**Priority:** P0 (Blocking)
**Time:** 30 minutes
**Prerequisites:** All Phase 1 tasks complete

**Validation Command:**
```bash
# Test 1: Simple text streaming
curl -N -X POST http://localhost:8001/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"Count to 5 slowly","messages":[]}' \
  2>&1 | tee test_stream.log

# Verify:
# - Stream started
# - Multiple text_delta events
# - Stream completed
# - No errors

# Test 2: Tool calling (generate_avatar)
curl -N -X POST http://localhost:8001/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"Generate 1 image of DANI as a tech reviewer","messages":[]}' \
  2>&1 | tee test_tool.log

# Verify:
# - thinking event
# - tool_call_start event
# - tool_executing event
# - tool_call_result event
# - complete event

# Test 3: Error handling
curl -N -X POST http://localhost:8001/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"","messages":[]}' \
  2>&1 | tee test_error.log

# Verify:
# - error event returned
# - Server doesn't crash
```

**Success Criteria:**
- [ ] All 3 tests pass
- [ ] No server crashes
- [ ] Events stream in real-time (< 500ms first token)
- [ ] Tool execution works correctly
- [ ] Error handling graceful

**If Any Test Fails:** Stop and debug before proceeding to Phase 2

---

## 📋 PHASE 2: FRONTEND STREAMING HOOK

**Goal:** Create React hook to consume SSE stream
**Estimated Time:** 3-4 hours
**Prerequisites:** Phase 1 complete

### Task 2.1: Create useStreamingChat hook skeleton
**Priority:** P0 (Blocking)
**Time:** 20 minutes
**Prerequisites:** Phase 1 complete

**Actions:**
```bash
mkdir -p frontend/src/features/chat/hooks
touch frontend/src/features/chat/hooks/useStreamingChat.ts
```

**File Content:**
```typescript
import { useState, useCallback } from 'react'
import { useChatStore } from '../stores/chatStore'
import { useConversationStore } from '@/shared/stores/conversationStore'
import type { ChatMessage } from '../stores/chatStore'

interface StreamEvent {
  type: 'start' | 'thinking' | 'text_delta' | 'tool_call_start' | 'tool_executing' | 'tool_call_result' | 'complete' | 'error'
  [key: string]: any
}

export function useStreamingChat() {
  const { addMessage, appendToLastMessage, setThinking, updateToolExecution } = useChatStore()
  const { currentConversationId } = useConversationStore()
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null)

  const sendStreamingMessage = useCallback(async (
    message: string,
    options?: {
      selectedImages?: any[]
      pastedImages?: string[]
      userConfig?: any
    }
  ) => {
    setIsStreaming(true)

    // Create user message
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    }
    addMessage(userMsg)

    // Create empty assistant message
    const assistantMsgId = `msg_${Date.now()}_assistant`
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }
    addMessage(assistantMsg)
    setCurrentStreamId(assistantMsgId)

    try {
      // TODO: Connect to SSE
      // TODO: Process events
      // TODO: Update UI

      console.log('🚀 Streaming not yet implemented')

    } catch (error) {
      console.error('Stream error:', error)
      // TODO: Error handling
    } finally {
      setIsStreaming(false)
      setCurrentStreamId(null)
    }
  }, [addMessage, currentConversationId])

  const stopStreaming = useCallback(() => {
    // TODO: Abort stream
    setIsStreaming(false)
    setCurrentStreamId(null)
  }, [])

  return {
    sendStreamingMessage,
    stopStreaming,
    isStreaming,
    currentStreamId
  }
}
```

**Validation Criteria:**
- [ ] File created at correct path
- [ ] Imports compile without errors
- [ ] Hook exports correct interface
- [ ] TypeScript types are correct

**Validation Test:**
```typescript
// In a test file or temporary component
import { useStreamingChat } from '@/features/chat/hooks/useStreamingChat'

function TestComponent() {
  const { sendStreamingMessage, isStreaming } = useStreamingChat()

  return (
    <div>
      <button onClick={() => sendStreamingMessage('test')}>Test</button>
      <p>{isStreaming ? 'Streaming...' : 'Idle'}</p>
    </div>
  )
}
```

**Rollback Plan:**
```bash
rm -rf frontend/src/features/chat/hooks
```

---

### Task 2.2: Update chatStore with streaming methods
**Priority:** P0 (Blocking)
**Time:** 20 minutes
**Prerequisites:** Task 2.1 complete

**Actions:**
Edit `frontend/src/features/chat/stores/chatStore.ts`, add new state and methods:

```typescript
interface ChatStore {
  // ... existing state

  // Streaming state
  isThinking: boolean
  thinkingStep: string
  thinkingMessage: string
  thinkingElapsed: number

  activeToolName: string | null
  toolProgress: number
  toolStatus: 'idle' | 'running' | 'complete' | 'error'

  // ... existing methods

  // Streaming methods
  appendToLastMessage: (messageId: string, chunk: string) => void
  setThinking: (step: string | null, message?: string, elapsed?: number) => void
  updateToolExecution: (toolName: string | null, progress?: number, status?: string) => void
}

// Implementation
appendToLastMessage: (messageId, chunk) => {
  set(state => ({
    messages: state.messages.map(msg =>
      msg.id === messageId
        ? { ...msg, content: msg.content + chunk }
        : msg
    )
  }))
},

setThinking: (step, message = '', elapsed = 0) => {
  set({
    isThinking: !!step,
    thinkingStep: step || '',
    thinkingMessage: message,
    thinkingElapsed: elapsed
  })
},

updateToolExecution: (toolName, progress = 0, status = 'idle') => {
  set({
    activeToolName: toolName,
    toolProgress: progress,
    toolStatus: status as any
  })
}
```

**Validation Criteria:**
- [ ] chatStore compiles without TypeScript errors
- [ ] New methods work correctly:
```typescript
const { appendToLastMessage, setThinking, updateToolExecution } = useChatStore()

// Test append
appendToLastMessage('msg_123', 'Hello')
appendToLastMessage('msg_123', ' World')
// Should result in message with content "Hello World"

// Test thinking
setThinking('analyzing', 'Understanding request...', 100)
// Should set isThinking=true, thinkingStep='analyzing', etc.

// Test tool execution
updateToolExecution('generate_avatar', 50, 'running')
// Should set activeToolName='generate_avatar', toolProgress=50, toolStatus='running'
```

**Rollback Plan:**
```bash
git restore frontend/src/features/chat/stores/chatStore.ts
```

---

### Task 2.3: Implement SSE consumer in hook
**Priority:** P0 (Blocking)
**Time:** 60 minutes
**Prerequisites:** Task 2.1, 2.2 complete

**Actions:**
Update `useStreamingChat.ts` with full SSE implementation:

```typescript
const sendStreamingMessage = useCallback(async (
  message: string,
  options?: {
    selectedImages?: any[]
    pastedImages?: string[]
    userConfig?: any
  }
) => {
  setIsStreaming(true)

  const userMsg: ChatMessage = {
    id: `msg_${Date.now()}`,
    role: 'user',
    content: message,
    timestamp: new Date()
  }
  addMessage(userMsg)

  const assistantMsgId = `msg_${Date.now()}_assistant`
  const assistantMsg: ChatMessage = {
    id: assistantMsgId,
    role: 'assistant',
    content: '',
    timestamp: new Date()
  }
  addMessage(assistantMsg)
  setCurrentStreamId(assistantMsgId)

  try {
    // Fetch with streaming
    const response = await fetch('http://localhost:8001/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        messages: useChatStore.getState().messages.slice(-10), // Last 10 messages
        conversation_id: currentConversationId,
        selectedImages: options?.selectedImages || [],
        pastedImages: options?.pastedImages || [],
        userConfig: options?.userConfig
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('ReadableStream not supported')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        console.log('✅ Stream complete')
        break
      }

      // Decode chunk
      const chunk = decoder.decode(value, { stream: true })
      buffer += chunk

      // Process complete lines
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event: StreamEvent = JSON.parse(line.slice(6))
            handleStreamEvent(event, assistantMsgId)
          } catch (e) {
            console.error('Failed to parse SSE event:', line, e)
          }
        }
      }
    }

  } catch (error) {
    console.error('Stream error:', error)

    // Show error message in chat
    appendToLastMessage(assistantMsgId, '\n\n❌ Error: ' + (error as Error).message)

    // TODO: Fallback to non-streaming endpoint

  } finally {
    setIsStreaming(false)
    setCurrentStreamId(null)
    setThinking(null)
    updateToolExecution(null)
  }
}, [addMessage, appendToLastMessage, currentConversationId, setThinking, updateToolExecution])

const handleStreamEvent = (event: StreamEvent, messageId: string) => {
  console.log('📨 SSE Event:', event.type, event)

  switch (event.type) {
    case 'start':
      console.log('🚀 Stream started')
      break

    case 'thinking':
      setThinking(event.step, event.message, event.elapsed_ms)
      break

    case 'text_delta':
      appendToLastMessage(messageId, event.content)
      break

    case 'tool_call_start':
      updateToolExecution(event.tool_name, 0, 'running')
      console.log('🔧 Tool called:', event.tool_name, event.tool_args)
      break

    case 'tool_executing':
      updateToolExecution(event.tool_name, event.progress || 50, 'running')
      break

    case 'tool_call_result':
      updateToolExecution(event.tool_name, 100, 'complete')
      console.log('✅ Tool result:', event.result)

      // If images generated, trigger gallery refresh
      if (event.result?.images) {
        window.dispatchEvent(new CustomEvent('imagesUpdated'))
      }
      break

    case 'complete':
      console.log('✨ Stream complete:', event)
      setThinking(null)
      updateToolExecution(null)
      break

    case 'error':
      console.error('❌ Stream error:', event.error)
      setThinking(null)
      updateToolExecution(null)
      // Show error in chat
      appendToLastMessage(messageId, `\n\n❌ Error: ${event.error}`)
      break

    default:
      console.warn('Unknown event type:', event.type)
  }
}
```

**Validation Criteria:**
- [ ] SSE connection established successfully
- [ ] Events parsed correctly
- [ ] Text chunks append to message in real-time
- [ ] Thinking state updates
- [ ] Tool execution state updates
- [ ] Complete event closes stream
- [ ] Error event handled gracefully

**Validation Test:**
```typescript
// In browser console
const { sendStreamingMessage } = useStreamingChat()
await sendStreamingMessage('Count to 5')

// Should see:
// 📨 SSE Event: start {...}
// 📨 SSE Event: thinking {...}
// 📨 SSE Event: text_delta {content: "1"}
// 📨 SSE Event: text_delta {content: " 2"}
// ...
// ✨ Stream complete
```

**Rollback Plan:**
```bash
git restore frontend/src/features/chat/hooks/useStreamingChat.ts
```

---

### Task 2.4: Integrate useStreamingChat into ChatAgent
**Priority:** P0 (Blocking)
**Time:** 20 minutes
**Prerequisites:** Task 2.3 complete

**Actions:**
Edit `frontend/src/features/chat/components/ChatAgent.tsx`:

```typescript
import { useStreamingChat } from '../hooks/useStreamingChat'

// Inside ChatAgent component
const { sendStreamingMessage, isStreaming, stopStreaming } = useStreamingChat()

// Replace handleSend
const handleSend = async () => {
  if (!input.trim() || isStreaming) return

  const trimmedInput = input.trim()
  setInput('')

  try {
    // Use streaming
    await sendStreamingMessage(trimmedInput, {
      selectedImages: selectedImages,
      pastedImages: pastedImages.map(img => img.base64),
      userConfig: config
    })

    // Clear selections after send
    clearSelectedImages()
    setPastedImages([])

  } catch (error) {
    console.error('Send failed:', error)
    toast.error('Failed to send message')
  }
}

// Add stop button in UI
{isStreaming && (
  <button
    onClick={stopStreaming}
    className="absolute top-2 right-2 bg-red-500 text-white px-4 py-2 rounded"
  >
    ⏹️ Stop
  </button>
)}
```

**Validation Criteria:**
- [ ] ChatAgent compiles without errors
- [ ] Send button triggers streaming
- [ ] Loading state shows correctly
- [ ] Stop button appears during streaming
- [ ] Stop button works (TODO: implement abort)

**Validation Test:**
Open browser, send message, verify:
- [ ] User message appears immediately
- [ ] Assistant message starts empty
- [ ] Text appears word-by-word
- [ ] Stop button visible during stream

**Rollback Plan:**
```bash
git restore frontend/src/features/chat/components/ChatAgent.tsx
```

---

## ⏸️ CHECKPOINT: Phase 1 & 2 Validation

Before proceeding to Phase 3 (UI components), verify:

```bash
# Backend test
curl -N -X POST http://localhost:8001/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","messages":[]}' | head -30

# Should see SSE events streaming

# Frontend test
# Open browser to localhost:3000
# Send message in chat
# Should see:
# - Message appears immediately
# - Text streams in real-time
# - Console shows SSE events
```

**If both tests pass:** ✅ Proceed to Phase 3
**If either test fails:** ❌ Debug before continuing

---

## 📋 PHASE 3: UI COMPONENTS

**Goal:** Add ThinkingModal and ToolCallVisualization components
**Estimated Time:** 4-5 hours
**Prerequisites:** Phase 2 complete

### Task 3.1: Create StreamingCursor component
**Priority:** P2 (Medium)
**Time:** 15 minutes

**Actions:**
```bash
touch frontend/src/components/ui/StreamingCursor.tsx
```

**File Content:**
```typescript
export function StreamingCursor() {
  return (
    <span
      className="inline-block w-2 h-4 bg-purple-500 ml-1 animate-pulse"
      aria-label="Streaming"
    />
  )
}
```

**Validation:** Visual check in browser

---

### Task 3.2: Create ThinkingModal component
**Priority:** P1 (High)
**Time:** 40 minutes

**Actions:**
```bash
touch frontend/src/components/ui/ThinkingModal.tsx
```

**File Content:**
```typescript
'use client'

interface ThinkingModalProps {
  isVisible: boolean
  step: string
  message: string
  elapsed: number
}

export function ThinkingModal({ isVisible, step, message, elapsed }: ThinkingModalProps) {
  if (!isVisible) return null

  return (
    <div className="fixed bottom-24 right-4 z-50 animate-slide-up">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-purple-200 dark:border-purple-700 p-4 max-w-sm">
        <div className="flex items-center gap-3">
          {/* Brain animation */}
          <div className="relative">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-2xl">🧠</span>
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full animate-ping" />
          </div>

          <div className="flex-1">
            <p className="font-semibold text-gray-900 dark:text-white text-sm">
              {step}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {message}
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              {elapsed}ms elapsed
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Validation:** Add to ChatAgent and test

---

### Task 3.3: Create ToolCallVisualization component
**Priority:** P1 (High)
**Time:** 60 minutes

**Actions:**
```bash
touch frontend/src/components/ui/ToolCallVisualization.tsx
```

**File Content:**
```typescript
'use client'
import { useState } from 'react'

interface ToolCallVisualizationProps {
  toolName: string
  toolArgs: Record<string, any>
  progress: number
  status: 'running' | 'complete' | 'error'
  result?: any
}

export function ToolCallVisualization({
  toolName,
  toolArgs,
  progress,
  status,
  result
}: ToolCallVisualizationProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getToolIcon = (name: string) => {
    switch (name) {
      case 'generate_avatar': return '🎨'
      case 'create_images': return '🖼️'
      case 'combine_images': return '🔀'
      default: return '🔧'
    }
  }

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'running': return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
      case 'complete': return 'border-green-500 bg-green-50 dark:bg-green-900/20'
      case 'error': return 'border-red-500 bg-red-50 dark:bg-red-900/20'
      default: return 'border-gray-300 bg-gray-50 dark:bg-gray-800'
    }
  }

  return (
    <div className={`border-l-4 pl-4 my-3 p-3 rounded ${getStatusColor(status)}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getToolIcon(toolName)}</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {toolName}
          </span>
        </div>

        <span className="text-xs px-2 py-1 rounded bg-white dark:bg-gray-700">
          {status}
        </span>
      </div>

      {status === 'running' && (
        <div className="mt-2">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {progress}% complete
          </p>
        </div>
      )}

      <details
        className="mt-2"
        open={isExpanded}
        onToggle={(e) => setIsExpanded((e.target as HTMLDetailsElement).open)}
      >
        <summary className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-white">
          View {status === 'complete' && result ? 'result' : 'arguments'}
        </summary>

        <div className="mt-2">
          {status === 'complete' && result ? (
            <div className="space-y-2">
              {result.images && (
                <div>
                  <p className="text-xs font-medium mb-1">Generated Images:</p>
                  <div className="flex gap-2 flex-wrap">
                    {result.images.slice(0, 4).map((img: string, i: number) => (
                      <img
                        key={i}
                        src={img}
                        alt={`Result ${i + 1}`}
                        className="w-20 h-20 object-cover rounded"
                      />
                    ))}
                  </div>
                </div>
              )}

              <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto max-h-40 overflow-y-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          ) : (
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
              {JSON.stringify(toolArgs, null, 2)}
            </pre>
          )}
        </div>
      </details>
    </div>
  )
}
```

**Validation:** Add to ChatAgent, test with tool calls

---

### Task 3.4: Integrate ThinkingModal into ChatAgent
**Priority:** P1 (High)
**Time:** 15 minutes

**Actions:**
Edit ChatAgent.tsx:
```typescript
import { ThinkingModal } from '@/components/ui/ThinkingModal'

const { isThinking, thinkingStep, thinkingMessage, thinkingElapsed } = useChatStore()

// In JSX
<ThinkingModal
  isVisible={isThinking}
  step={thinkingStep}
  message={thinkingMessage}
  elapsed={thinkingElapsed}
/>
```

**Validation:** Send message, verify modal appears

---

### Task 3.5: Integrate ToolCallVisualization into MessageRenderer
**Priority:** P1 (High)
**Time:** 20 minutes

**Actions:**
Update chatStore to track tool calls per message:
```typescript
interface ChatMessage {
  // ... existing
  activeTool?: {
    name: string
    args: any
    progress: number
    status: string
    result?: any
  }
}
```

Update MessageRenderer to show tool visualization:
```typescript
{message.activeTool && (
  <ToolCallVisualization
    toolName={message.activeTool.name}
    toolArgs={message.activeTool.args}
    progress={message.activeTool.progress}
    status={message.activeTool.status}
    result={message.activeTool.result}
  />
)}
```

**Validation:** Send tool-calling message, verify visualization

---

### Task 3.6: Add StreamingCursor to MessageRenderer
**Priority:** P2 (Medium)
**Time:** 10 minutes

**Actions:**
Update MessageRenderer.tsx:
```typescript
import { StreamingCursor } from './StreamingCursor'

interface MessageRendererProps {
  // ... existing
  isStreaming?: boolean
}

// In JSX after markdown
{isStreaming && <StreamingCursor />}
```

Update ChatAgent to pass isStreaming:
```typescript
<MessageRenderer
  {...message}
  isStreaming={message.id === currentStreamId && isStreaming}
/>
```

**Validation:** Visual check during streaming

---

## 📋 PHASE 4: INTEGRATION & TESTING

**Goal:** Polish, test, and deploy
**Estimated Time:** 3-4 hours

### Task 4.1: Add feature flag
**Priority:** P1 (High)
**Time:** 10 minutes

**Actions:**
```bash
# frontend/.env.local
echo "NEXT_PUBLIC_ENABLE_STREAMING=true" >> .env.local
```

```typescript
// frontend/src/config/features.ts
export const FEATURES = {
  ENABLE_STREAMING: process.env.NEXT_PUBLIC_ENABLE_STREAMING === 'true'
}
```

Update ChatAgent:
```typescript
import { FEATURES } from '@/config/features'

const handleSend = async () => {
  if (FEATURES.ENABLE_STREAMING) {
    await sendStreamingMessage(...)
  } else {
    await sendNonStreamingMessage(...) // Fallback
  }
}
```

**Validation:** Toggle flag, verify behavior changes

---

### Task 4.2: Implement stop generation
**Priority:** P2 (Medium)
**Time:** 20 minutes

**Actions:**
Update useStreamingChat with AbortController:
```typescript
const abortControllerRef = useRef<AbortController | null>(null)

const sendStreamingMessage = async (...) => {
  abortControllerRef.current = new AbortController()

  const response = await fetch('...', {
    signal: abortControllerRef.current.signal,
    ...
  })

  // ...
}

const stopStreaming = useCallback(() => {
  if (abortControllerRef.current) {
    abortControllerRef.current.abort()
    abortControllerRef.current = null
  }
  setIsStreaming(false)
}, [])
```

**Validation:** Click stop button mid-stream, verify abort

---

### Task 4.3: Add comprehensive error handling
**Priority:** P1 (High)
**Time:** 30 minutes

**Actions:**
Update useStreamingChat with error scenarios:
```typescript
catch (error) {
  if (error.name === 'AbortError') {
    console.log('Stream aborted by user')
    appendToLastMessage(assistantMsgId, '\n\n⏹️ Stopped by user')
  } else if (error.message.includes('fetch')) {
    console.error('Network error:', error)
    toast.error('Connection failed. Retrying...')
    // Retry logic
  } else {
    console.error('Unknown error:', error)
    toast.error('An error occurred. Please try again.')
  }
}
```

**Validation:** Test various error scenarios

---

### Task 4.4: Write unit tests
**Priority:** P2 (Medium)
**Time:** 60 minutes

**Actions:**
```bash
touch frontend/src/features/chat/__tests__/useStreamingChat.test.ts
```

**Test Cases:**
- [ ] sendStreamingMessage creates user and assistant messages
- [ ] SSE events update state correctly
- [ ] stopStreaming aborts fetch
- [ ] Error handling works
- [ ] Fallback triggers on failure

**Validation:** `npm test`

---

### Task 4.5: Performance testing
**Priority:** P2 (Medium)
**Time:** 30 minutes

**Actions:**
```bash
# Test with 100+ messages
# Monitor memory usage
# Check for memory leaks
# Test on mobile device
```

**Validation:** No performance degradation

---

### Task 4.6: Final end-to-end test
**Priority:** P0 (Blocking)
**Time:** 30 minutes

**Test Scenarios:**
1. [ ] Simple text streaming works
2. [ ] Tool calling (generate_avatar) works
3. [ ] Tool calling (combine_images) works
4. [ ] Stop button works
5. [ ] Error handling works
6. [ ] Feature flag toggle works
7. [ ] Mobile responsive
8. [ ] No console errors
9. [ ] No memory leaks
10. [ ] Images auto-save after generation

**Validation:** All scenarios pass

---

## ✅ COMPLETION CHECKLIST

### Backend
- [ ] Anthropic SDK installed
- [ ] `/api/chat/stream` endpoint working
- [ ] SSE events streaming correctly
- [ ] Tool execution works
- [ ] Error handling robust
- [ ] Logging comprehensive

### Frontend
- [ ] useStreamingChat hook working
- [ ] SSE consumer parsing events
- [ ] chatStore updated with streaming methods
- [ ] ThinkingModal shows during thinking
- [ ] ToolCallVisualization shows during tools
- [ ] StreamingCursor animates
- [ ] Stop button works
- [ ] Feature flag implemented

### Testing
- [ ] Backend curl tests pass
- [ ] Frontend E2E tests pass
- [ ] Performance acceptable
- [ ] Mobile responsive
- [ ] Error scenarios handled

### Documentation
- [ ] README updated
- [ ] API docs updated
- [ ] User guide created

---

## 🚀 GO/NO-GO DECISION

**Criteria for "GO" (Ready for Production):**
- ✅ All backend tests pass
- ✅ All frontend tests pass
- ✅ No critical bugs
- ✅ Performance acceptable
- ✅ Error handling robust
- ✅ Feature flag working
- ✅ Fallback working
- ✅ Documentation complete

**If all criteria met:** 🟢 GO - Enable for users
**If any criteria missing:** 🔴 NO-GO - Fix and retest

---

## 📊 ESTIMATED TIME BREAKDOWN

| Phase | Tasks | Time | Cumulative |
|-------|-------|------|------------|
| Phase 1: Backend | 10 tasks | 4-6 hours | 4-6 hours |
| Phase 2: Frontend Hook | 4 tasks | 3-4 hours | 7-10 hours |
| Phase 3: UI Components | 6 tasks | 4-5 hours | 11-15 hours |
| Phase 4: Integration | 6 tasks | 3-4 hours | 14-19 hours |
| **TOTAL** | **26 tasks** | **14-19 hours** | |

**Realistic Estimate with Debugging:** 18-22 hours (2-3 full days)

---

**Last Updated:** 2025-01-XX
**Status:** ✅ Ready for Execution
**Next Action:** Begin Task 1.1
