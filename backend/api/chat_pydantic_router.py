"""
Chat Router using Pydantic AI - Clean, modern implementation

This replaces the manual tool calling from OpenRouter with declarative Pydantic AI.
Same functionality, better architecture, automatic streaming support.
"""

import json
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from agents.image_agent import (
    run_agent,
    run_agent_streaming,
    AgentContext,
    UserImageConfig,
    SelectedImage,
)

# Import response models from existing code
from api.chat_router import ChatMessage, PipelineStage, ChatResponse

logger = logging.getLogger(__name__)
router = APIRouter()


# ============================================================================
# REQUEST MODELS (Same as before for API compatibility)
# ============================================================================

class ChatRequest(BaseModel):
    """User message with context for image generation"""
    message: str = Field(description="User's message/request")
    messages: List[ChatMessage] = Field(
        default=[],
        description="Previous conversation messages for context"
    )
    selectedImages: List[SelectedImage] = Field(
        default=[],
        description="Images selected from gallery for combination/reference"
    )
    pastedImages: List[str] = Field(
        default=[],
        description="Base64 encoded images pasted from clipboard"
    )
    userConfig: Optional[UserImageConfig] = Field(
        default=None,
        description="User's image generation configuration"
    )


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Chat endpoint using Pydantic AI agent.

    Handles image generation with automatic tool calling.
    Returns response with images, usage stats, and pipeline stages.
    """
    try:
        logger.info(f"💬 Chat request received via Pydantic AI router")
        logger.info(f"   Message: '{request.message[:100]}...'")
        logger.info(f"   Context: {len(request.messages)} messages, "
                   f"{len(request.selectedImages) if request.selectedImages else 0} images")

        # Build enhanced system prompt with context
        system_content = _build_system_prompt(
            request.selectedImages,
            request.userConfig
        )

        # Run the agent
        result = await run_agent(
            message=request.message,
            user_config=request.userConfig,
            selected_images=request.selectedImages,
            message_history=[(m.role, m.content) for m in request.messages] if request.messages else None
        )

        logger.info(f"✅ Agent execution complete")

        # Parse result and extract tool information
        response_text = result.get("response", "")
        tool_used = None
        tool_result = None

        # Try to extract tool result from response metadata if available
        if isinstance(result, dict) and "metadata" in result:
            metadata = result["metadata"]
            if "tool_used" in metadata:
                tool_used = metadata["tool_used"]
            if "tool_result" in metadata:
                tool_result = metadata["tool_result"]

        return ChatResponse(
            response=response_text,
            tool_used=tool_used,
            tool_result=tool_result,
            usage=result.get("usage"),
            model="anthropic/claude-4.5-sonnet-20251022",
            pipeline=[
                PipelineStage(
                    id="stage_1",
                    name="Understanding Request",
                    icon="🤔",
                    status="complete",
                    message="Analyzed your message"
                ),
                PipelineStage(
                    id="stage_2",
                    name="AI Processing",
                    icon="🧠",
                    status="complete",
                    message="Claude processed your request"
                ),
                PipelineStage(
                    id="stage_3",
                    name="Tool Execution",
                    icon="⚙️",
                    status="complete",
                    message="Tools executed successfully"
                ),
            ]
        )

    except Exception as e:
        logger.error(f"❌ Chat error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Chat processing error: {str(e)}"
        )


@router.get("/chat/health")
async def health():
    """Health check for chat service"""
    return {
        "status": "healthy",
        "backend": "fastapi",
        "agent": "pydantic-ai",
        "model": "anthropic/claude-4.5-sonnet-20251022"
    }


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def _build_system_prompt(
    selected_images: Optional[List[SelectedImage]] = None,
    user_config: Optional[UserImageConfig] = None
) -> str:
    """Build system prompt with context"""
    from system_prompts.agent_system_prompt import AGENT_SYSTEM_PROMPT

    content = AGENT_SYSTEM_PROMPT

    # Add user configuration context
    if user_config:
        config_context = f"\n\nUSER IMAGE CONFIGURATION:\n"
        config_context += f"- Creativity (temperature): {user_config.temperature}\n"

        if user_config.style_preset and user_config.style_preset != 'photorealistic':
            config_context += f"- Style: {user_config.style_preset}\n"
        if user_config.lighting_preference and user_config.lighting_preference != 'studio':
            config_context += f"- Lighting: {user_config.lighting_preference}\n"
        if user_config.mood and user_config.mood != 'professional':
            config_context += f"- Mood: {user_config.mood}\n"
        if user_config.seed:
            config_context += f"- Seed: {user_config.seed}\n"

        config_context += "\nIMPORTANT: Use these preferences when calling image tools."
        content += config_context

    # Add selected images context
    if selected_images:
        images_context = f"\n\nSELECTED IMAGES CONTEXT ({len(selected_images)} images):\n"
        image_urls = []

        for i, img in enumerate(selected_images, 1):
            images_context += f"Image {i}: {img.url} (ID: {img.id})\n"
            image_urls.append(img.url)

        images_context += f"\nImage URLs: {image_urls}\n"
        images_context += "When user asks to combine images, use ALL URLs in combine_images tool."
        content += images_context

    return content


# ============================================================================
# STREAMING SUPPORT (Future SSE implementation)
# ============================================================================

@router.post("/chat/stream")
async def chat_stream_endpoint(request: ChatRequest):
    """
    Streaming chat endpoint with real-time thinking visualization.

    Returns Server-Sent Events with agent's thinking process.
    """
    try:
        logger.info(f"🚀 Streaming chat request: '{request.message[:100]}...'")

        async def event_generator():
            try:
                # Send initial event
                yield f"data: {json.dumps({'type': 'start', 'message': 'Starting agent processing...'})}\n\n"

                # Stream agent response
                async for event in run_agent_streaming(
                    message=request.message,
                    user_config=request.userConfig,
                    selected_images=request.selectedImages,
                    message_history=[(m.role, m.content) for m in request.messages] if request.messages else None
                ):
                    yield f"data: {json.dumps(event)}\n\n"

                # Send completion event
                yield f"data: {json.dumps({'type': 'complete', 'message': 'Processing complete'})}\n\n"

            except Exception as e:
                logger.error(f"❌ Streaming error: {str(e)}", exc_info=True)
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

        # Import streaming response
        from fastapi.responses import StreamingResponse

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            }
        )

    except Exception as e:
        logger.error(f"❌ Stream endpoint error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Streaming error: {str(e)}"
        )
