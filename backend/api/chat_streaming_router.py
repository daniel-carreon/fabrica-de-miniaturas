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
    ChatRequest as BaseChatRequest, ChatMessage, SelectedImage, UserImageConfig, PastedImage,
    call_generate_api, call_create_images_api, call_combine_images_api_multi
)
from system_prompts.agent_system_prompt import AGENT_SYSTEM_PROMPT
from pydantic import Field
from typing import Literal

# Extended ChatRequest with thinking support
class ChatRequest(BaseChatRequest):
    """Extended chat request with extended thinking support"""
    enable_thinking: bool = Field(default=False, description="Enable Claude's extended thinking mode")
    model: Optional[Literal['sonnet', 'haiku']] = Field(
        default='sonnet',
        description="Anthropic model to use: 'sonnet' (Claude Sonnet 4.5) or 'haiku' (Claude Haiku 4.5)"
    )

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

def validate_image_content(base64_data: str, media_type: str) -> tuple[bool, str]:
    """
    Validate that base64 content matches declared media_type using magic numbers.

    Returns: (is_valid, error_message)
    """
    import base64

    try:
        # Decode base64
        decoded = base64.b64decode(base64_data)
    except Exception as e:
        return False, f"Invalid base64 encoding: {str(e)}"

    # Check size (max 5MB)
    if len(decoded) > 5 * 1024 * 1024:
        return False, f"Image too large: {len(decoded) / 1024 / 1024:.2f}MB (max 5MB)"

    # Verify magic numbers (file signatures)
    magic_numbers = {
        'image/jpeg': [b'\xff\xd8\xff'],
        'image/jpg': [b'\xff\xd8\xff'],
        'image/png': [b'\x89PNG\r\n\x1a\n'],
        'image/gif': [b'GIF87a', b'GIF89a'],
        'image/webp': [b'RIFF']  # WebP has RIFF header
    }

    if media_type in magic_numbers:
        signatures = magic_numbers[media_type]
        is_valid = any(decoded.startswith(sig) for sig in signatures)

        if not is_valid:
            return False, f"Content doesn't match declared type {media_type}. File signature mismatch."

    return True, ""

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
            # 🚨 CRITICAL FIX: Skip base64 images to prevent token overflow (211k tokens > 200k max)
            if img.url.startswith('data:'):
                logger.warning(f"⚠️ Skipping base64 image from context (too many tokens). URL will be in system prompt only.")
                continue  # Skip, don't add to messages array

            user_content.append({
                "type": "image",
                "source": {
                    "type": "url",
                    "url": img.url
                }
            })

    # Add pasted images (if any)
    # 🚨 CRITICAL FIX: Skip pasted images to prevent token overflow
    # Pasted base64 images consume 50k-100k tokens each
    if request.pastedImages:
        logger.warning(f"⚠️ Skipping {len(request.pastedImages)} pasted images from context (too many tokens)")
        # DO NOT add pastedImages to context - they cause token overflow

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
        # 🚨 CRITICAL FIX: Only list non-base64 URLs in system prompt to prevent token overflow
        non_base64_images = [img for img in request.selectedImages if not img.url.startswith('data:')]
        if non_base64_images:
            prompt_parts.append(f"\n\n🖼️ USER HAS SELECTED {len(non_base64_images)} IMAGES:")
            for i, img in enumerate(non_base64_images, 1):
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

        # Map frontend model names to Anthropic API model IDs
        model_map = {
            'sonnet': 'claude-sonnet-4-5-20250929',
            'haiku': 'claude-haiku-4-5-20251001'
        }
        selected_model = model_map.get(request.model, model_map['sonnet'])
        model_name = 'Claude Sonnet 4.5' if request.model == 'sonnet' else 'Claude Haiku 4.5'
        logger.info(f"🤖 Using model: {model_name} ({selected_model})")

        # Build API params
        api_params = {
            "model": selected_model,
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
                        # Send phase change event (NEW - Phase-based architecture)
                        yield sse_event('phase_change', {
                            'from_phase': 'idle',
                            'to_phase': 'thinking',
                            'elapsed_ms': int((time.time() - start_time) * 1000)
                        })

                        # Send initial thinking event with prominent message (legacy)
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
            # Send tool_calls_detected event (NEW - Phase-based architecture)
            yield sse_event('tool_calls_detected', {
                'tools': [{'name': t['name'], 'id': t['id']} for t in tool_use_blocks],
                'count': len(tool_use_blocks),
                'elapsed_ms': int((time.time() - start_time) * 1000)
            })

            # Send phase change to executing_tool (NEW)
            yield sse_event('phase_change', {
                'from_phase': 'thinking',
                'to_phase': 'executing_tool',
                'tool_name': tool_use_blocks[0]['name'],
                'elapsed_ms': int((time.time() - start_time) * 1000)
            })

            # 🔄 AGENTIC LOOP: Collect tool results for Turn 2
            tool_results_list = []

            for tool_block in tool_use_blocks:
                # Send executing event (legacy)
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

                    # 🚨 CRITICAL FIX: Create TWO versions of result
                    # 1. Full result with images for frontend SSE event
                    # 2. Clean result WITHOUT images for Turn 2 (prevents token overflow)

                    # Send FULL result to frontend (includes images for display)
                    logger.info(f"📤 Sending SSE event 'tool_call_result' with {len(result.get('images', []))} images")
                    yield sse_event('tool_call_result', {
                        'tool_id': tool_block['id'],
                        'tool_name': tool_block['name'],
                        'result': result  # Full result with images
                    })
                    logger.info(f"✅ SSE event 'tool_call_result' sent successfully")

                    # 🔄 AGENTIC LOOP: Store CLEAN result for Turn 2 (no images/base64)
                    # Only keep success message and metadata
                    clean_result_for_turn2 = {
                        "success": result.get("success", True),
                        "message": result.get("message", f"Tool {tool_block['name']} executed successfully"),
                        "count": result.get("count", result.get("total", 0)),
                        "tool": result.get("tool", tool_block['name'])
                        # Intentionally exclude 'images' array to prevent token overflow
                    }
                    tool_results_list.append(clean_result_for_turn2)

                except Exception as tool_error:
                    logger.error(f"Tool execution failed: {tool_error}", exc_info=True)

                    # 🔄 AGENTIC LOOP: Store error as result for Turn 2
                    error_result = {"error": str(tool_error)}
                    tool_results_list.append(error_result)

                    yield sse_event('tool_call_result', {
                        'tool_id': tool_block['id'],
                        'tool_name': tool_block['name'],
                        'error': str(tool_error)
                    })

        # 🔄 AGENTIC LOOP TURN 2: Send tool results back to Claude for final response
        if tool_use_blocks and tool_results_list:
            logger.info("🔄 AGENTIC LOOP: Entering Turn 2 - Sending tool results to Claude...")

            # Build tool results content for Anthropic API
            tool_results_content = []
            for i, tool_block in enumerate(tool_use_blocks):
                if i < len(tool_results_list):
                    result = tool_results_list[i]
                    # Format result as JSON string for Anthropic
                    result_str = json.dumps(result) if isinstance(result, dict) else str(result)

                    # 🔍 DEBUG: Log result size and check for images
                    logger.info(f"🔍 DEBUG Turn 2 result {i+1}: size={len(result_str)} chars, has_images={'images' in str(result)}")

                    tool_results_content.append({
                        "type": "tool_result",
                        "tool_use_id": tool_block['id'],
                        "content": result_str
                    })
                    logger.debug(f"🔧 Tool result {i+1}: {tool_block['name']} -> {result_str[:100]}...")

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

            # Construct Turn 2 conversation
            messages_turn2 = messages + [assistant_tool_message, user_tool_results_message]

            # Send phase change to responding
            yield sse_event('phase_change', {
                'from_phase': 'executing_tool',
                'to_phase': 'responding',
                'elapsed_ms': int((time.time() - start_time) * 1000)
            })

            logger.info(f"🚀 AGENTIC LOOP Turn 2: Streaming Claude's final response...")

            # TURN 2: Stream Claude's final response
            turn2_response = ""
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

                        # Stream final response text
                        if delta.type == "text_delta":
                            text_chunk = delta.text
                            turn2_response += text_chunk
                            full_response += text_chunk
                            yield sse_event('text_delta', {
                                'content': text_chunk,
                                'index': len(full_response)
                            })
                            await asyncio.sleep(0)

                # Get Turn 2 final message for usage stats
                final_message_turn2 = stream2.get_final_message()
                # Update final_message with Turn 2 usage
                final_message = final_message_turn2

            logger.info(f"✅ AGENTIC LOOP Turn 2 complete: {len(turn2_response)} chars streamed")

        # Send phase change to idle
        yield sse_event('phase_change', {
            'from_phase': 'responding' if tool_use_blocks else 'thinking',
            'to_phase': 'idle',
            'elapsed_ms': int((time.time() - start_time) * 1000)
        })

        # Send completion event
        elapsed_ms = int((time.time() - start_time) * 1000)
        logger.info(f"✨ Stream complete: {elapsed_ms}ms total, {len(full_response)} chars, {len(tool_use_blocks)} tools used")

        yield sse_event('complete', {
            'final_response': full_response,
            'tool_used': tool_use_blocks[0]['name'] if tool_use_blocks else None,
            'usage': {
                'input_tokens': final_message.usage.input_tokens,
                'output_tokens': final_message.usage.output_tokens
            },
            'model': selected_model,
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
