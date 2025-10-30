"""
Streaming Chat Router - SSE Implementation with Anthropic SDK
Real-time streaming with thinking visualization and tool calling
"""
import json
import time
import logging
import asyncio
from typing import AsyncGenerator, List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import anthropic
from anthropic import APIError, APITimeoutError, RateLimitError
import os
from dotenv import load_dotenv

from api.chat_router import (
    ChatRequest as BaseChatRequest, ChatMessage, SelectedImage, UserImageConfig,
    call_generate_api, call_create_images_api, call_combine_images_api_multi
)
from system_prompts.agent_system_prompt import AGENT_SYSTEM_PROMPT
from pydantic import Field

# Extended ChatRequest with thinking support
class ChatRequest(BaseChatRequest):
    """Extended chat request with extended thinking support"""
    enable_thinking: bool = Field(default=False, description="Enable Claude's extended thinking mode")

load_dotenv()
logger = logging.getLogger(__name__)
router = APIRouter()

# Anthropic client
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY or ANTHROPIC_API_KEY == "YOUR_ANTHROPIC_API_KEY_HERE":
    logger.warning("⚠️ ANTHROPIC_API_KEY not configured - streaming endpoint will not work fully")
    ANTHROPIC_API_KEY = None

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None

def sse_event(event_type: str, data: dict) -> str:
    """Format Server-Sent Event"""
    return f"data: {json.dumps({'type': event_type, **data})}\n\n"

def build_messages(request: ChatRequest) -> List[Dict[str, Any]]:
    """Build messages array for Anthropic API"""
    messages = []

    # Add conversation history (last 10 messages to prevent context overflow)
    # Filter out empty messages (Claude requires non-empty content)
    for msg in request.messages[-10:]:
        if msg.content and msg.content.strip():  # Skip empty messages
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
            # Extract base64 data (remove data:image/xxx;base64, prefix if present)
            if ',' in base64_img:
                base64_data = base64_img.split(',')[1]
            else:
                base64_data = base64_img

            user_content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/jpeg",
                    "data": base64_data
                }
            })

    messages.append({
        "role": "user",
        "content": user_content
    })

    return messages

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
- Landscapes, cityscapes, objects, scenes
- Abstract art, photorealistic scenes""",
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

async def event_generator(request: ChatRequest) -> AsyncGenerator[str, None]:
    """Generate SSE events for streaming chat with comprehensive error handling"""
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

        # Check if Anthropic client is available
        if not client:
            yield sse_event('error', {
                'error': 'Anthropic API key not configured. Please set ANTHROPIC_API_KEY in .env',
                'recoverable': False,
                'error_type': 'config_error'
            })
            return

        # Stream with Anthropic SDK using RAW EVENTS for word-by-word streaming
        full_response = ""
        full_thinking = ""
        tool_use_blocks = []
        current_tool_json = ""
        current_tool_name = None
        current_tool_id = None

        # Build API params
        api_params = {
            "model": "claude-sonnet-4-5-20250929",
            "max_tokens": 8000,
            "system": system_prompt,
            "messages": messages,
            "tools": tools,
        }

        # Add thinking if enabled
        logger.info(f"🧠 Extended Thinking toggle value: enable_thinking={request.enable_thinking}")
        if request.enable_thinking:
            api_params["thinking"] = {
                "type": "enabled",
                "budget_tokens": 5000  # Reserve 5000 tokens for thinking
            }
            logger.info("✅ Extended thinking ENABLED with 5000 token budget")
            logger.info(f"📋 Full API params: {json.dumps({k: v for k, v in api_params.items() if k != 'messages'}, indent=2)}")
        else:
            logger.info("❌ Extended thinking DISABLED by user")

        with client.messages.stream(**api_params) as stream:
            # Process RAW events for real-time streaming
            for event in stream:
                event_type = event.type
                logger.debug(f"📨 Raw event received: type={event_type}")

                # THINKING DELTA - Claude's internal reasoning
                if event_type == "content_block_start":
                    block = event.content_block
                    logger.info(f"📦 content_block_start: block.type={block.type}")
                    if block.type == "thinking":
                        # Send initial thinking event with prominent message
                        yield sse_event('thinking_start', {
                            'step': 'pre_response_thinking',
                            'message': 'Claude is analyzing before responding...',
                            'elapsed_ms': int((time.time() - start_time) * 1000)
                        })
                        logger.info("🧠🧠🧠 Extended Thinking block DETECTED - Sending thinking_start event")
                        await asyncio.sleep(0)
                    elif block.type == "tool_use":
                        current_tool_name = block.name
                        current_tool_id = block.id
                        logger.debug(f"🔧 Tool use block started: {current_tool_name}")

                elif event_type == "content_block_delta":
                    delta = event.delta

                    # Text delta - the actual response text (WORD BY WORD!)
                    if delta.type == "text_delta":
                        text_chunk = delta.text
                        full_response += text_chunk
                        yield sse_event('text_delta', {
                            'content': text_chunk,
                            'index': len(full_response)
                        })
                        # CRITICAL: Force immediate flush to prevent buffering
                        await asyncio.sleep(0)

                    # Thinking delta - Claude's PRE-RESPONSE reasoning process
                    elif delta.type == "thinking_delta":
                        thinking_chunk = delta.thinking
                        full_thinking += thinking_chunk
                        yield sse_event('thinking_delta', {
                            'content': thinking_chunk,
                            'total_length': len(full_thinking),
                            'elapsed_ms': int((time.time() - start_time) * 1000),
                            'step': 'pre_response_thinking'
                        })
                        logger.debug(f"🧠 Thinking delta: {len(thinking_chunk)} chars (total: {len(full_thinking)})")
                        await asyncio.sleep(0)

                    # Tool input JSON delta - accumulate for later parsing
                    elif delta.type == "input_json_delta":
                        current_tool_json += delta.partial_json

                elif event_type == "content_block_stop":
                    # If thinking block finished, log it
                    if full_thinking:
                        logger.info(f"🧠 Extended Thinking complete: {len(full_thinking)} chars, {(time.time() - start_time):.2f}s")
                        yield sse_event('thinking_complete', {
                            'total_thinking_length': len(full_thinking),
                            'elapsed_ms': int((time.time() - start_time) * 1000)
                        })
                        await asyncio.sleep(0)

                    # If we were accumulating tool JSON, parse it now
                    if current_tool_name and current_tool_json:
                        try:
                            tool_input = json.loads(current_tool_json)
                            tool_use_blocks.append({
                                'name': current_tool_name,
                                'id': current_tool_id,
                                'input': tool_input
                            })
                            logger.info(f"🔧 Tool call detected: {current_tool_name}")

                            # Send tool call start event
                            yield sse_event('tool_call_start', {
                                'tool_name': current_tool_name,
                                'tool_id': current_tool_id,
                                'tool_args': tool_input
                            })
                        except json.JSONDecodeError as e:
                            logger.error(f"Failed to parse tool JSON: {e}")

                        # Reset tool accumulation
                        current_tool_json = ""
                        current_tool_name = None
                        current_tool_id = None

            # Get final message for metadata
            final_message = stream.get_final_message()

        # Execute tools if any (tool_use_blocks already populated during streaming)
        if tool_use_blocks:
            for tool_block in tool_use_blocks:
                # Send executing event
                yield sse_event('tool_executing', {
                    'tool_name': tool_block['name'],
                    'tool_id': tool_block['id'],
                    'status': 'running'
                })

                try:
                    result = None

                    if tool_block['name'] == "generate_avatar":
                        result = await call_generate_api(
                            prompt=tool_block['input'].get('prompt'),
                            num_images=tool_block['input'].get('numImages', 1),
                            user_config=request.userConfig,
                            selected_images=request.selectedImages
                        )
                    elif tool_block['name'] == "create_images":
                        result = await call_create_images_api(
                            prompt=tool_block['input'].get('prompt'),
                            style=tool_block['input'].get('style', 'photorealistic'),
                            num_images=tool_block['input'].get('numImages', 1),
                            user_config=request.userConfig
                        )
                    elif tool_block['name'] == "combine_images":
                        result = await call_combine_images_api_multi(
                            image_urls=tool_block['input'].get('image_urls'),
                            prompt=tool_block['input'].get('prompt'),
                            num_variations=1,
                            user_config=request.userConfig,
                            selected_images=request.selectedImages
                        )
                    else:
                        result = {"error": f"Unknown tool: {tool_block['name']}"}

                    logger.info(f"✅ Tool executed successfully: {tool_block['name']} (result_size: {len(str(result))})")

                    # Send tool result event
                    yield sse_event('tool_call_result', {
                        'tool_id': tool_block['id'],
                        'tool_name': tool_block['name'],
                        'result': result
                    })

                except Exception as tool_error:
                    logger.error(f"Tool execution failed: {tool_error}", exc_info=True)
                    yield sse_event('tool_call_result', {
                        'tool_id': tool_block['id'],
                        'tool_name': tool_block['name'],
                        'error': str(tool_error)
                    })

        # Send completion event
        elapsed_ms = int((time.time() - start_time) * 1000)
        logger.info(f"✨ Stream complete: {elapsed_ms}ms total, {len(full_response)} chars, {len(tool_use_blocks)} tools used")

        yield sse_event('complete', {
            'final_response': full_response,
            'tool_used': tool_use_blocks[0].name if tool_use_blocks else None,
            'usage': {
                'input_tokens': final_message.usage.input_tokens,
                'output_tokens': final_message.usage.output_tokens
            },
            'model': 'claude-sonnet-4-5-20250929',
            'elapsed_ms': elapsed_ms
        })

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

@router.post("/chat/stream")
async def chat_stream_endpoint(request: ChatRequest):
    """
    SSE streaming endpoint with real-time thinking and tool calling visualization.

    Events emitted:
    - start: Stream initialization
    - thinking: AI reasoning phase
    - text_delta: Incremental text chunks
    - tool_call_start: Tool execution beginning
    - tool_executing: Tool is running
    - tool_call_result: Tool execution result
    - complete: Stream finished
    - error: Error occurred

    Example usage:
    ```typescript
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      body: JSON.stringify({message: 'Hello', messages: []}),
    })
    const reader = response.body.getReader()
    while (true) {
      const {done, value} = await reader.read()
      if (done) break
      // Process SSE events
    }
    ```
    """
    logger.info(f"📨 Stream request: message_length={len(request.message)}, history_size={len(request.messages)}, selected_images={len(request.selectedImages) if request.selectedImages else 0}")

    return StreamingResponse(
        event_generator(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Nginx: disable buffering
        }
    )
