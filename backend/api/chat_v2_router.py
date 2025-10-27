"""
Chat V2 Router - Pydantic AI Based Chat Endpoint
Provides conversation-aware chat with automatic tool management
Backward compatible with existing /chat endpoint
"""

import logging
import os
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from application.chat_service import ChatService
from infrastructure.conversation_repository import ConversationRepository

load_dotenv()

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat-v2", tags=["chat-v2"])

# Initialize repository and service
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_ANON_KEY")
repo = ConversationRepository(supabase_url, supabase_key)
chat_service = ChatService(repo)

DEFAULT_USER = "daniel"


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class ChatV2Request(BaseModel):
    """Chat request with conversation context"""
    message: str = Field(..., min_length=1, max_length=5000, description="User message")
    conversation_id: Optional[str] = Field(
        None,
        description="Link message to existing conversation"
    )
    user_id: str = Field(default=DEFAULT_USER, description="User identifier")
    create_conversation: bool = Field(
        True,
        description="Auto-create conversation if not provided"
    )


class ImageInfo(BaseModel):
    """Information about a generated image"""
    url: str
    prompt: str
    tool: str = "generate_images"


class ToolCall(BaseModel):
    """Record of a tool call made by the agent"""
    tool_name: str
    status: str  # 'success' or 'error'
    result: dict = {}


class ChatV2Response(BaseModel):
    """Chat response with conversation tracking"""
    status: str  # 'success' or 'error'
    response: str  # Agent's response text
    conversation_id: str  # Linked or created conversation
    tool_calls: List[ToolCall] = Field(default_factory=list)
    images: List[ImageInfo] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    version: str


# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get("/health", response_model=HealthResponse, include_in_schema=False)
async def health_check():
    """Health check for /chat-v2 endpoint"""
    return {
        "status": "healthy",
        "service": "chat-v2-pydantic-ai",
        "version": "1.0.0",
    }


# ============================================================================
# CHAT ENDPOINT
# ============================================================================

@router.post("", response_model=ChatV2Response)
async def chat(request: ChatV2Request):
    """
    Chat endpoint using Pydantic AI agent with conversation context.

    This endpoint provides:
    - Automatic tool management (generate_images, combine_images)
    - Conversation persistence
    - Message history tracking
    - Structured responses

    Request:
    ```json
    {
        "message": "Generate 3 YouTube thumbnails with DANI portrait",
        "conversation_id": "550e8400-e29b-41d4-a716-446655440000",  # optional
        "user_id": "daniel",
        "create_conversation": true
    }
    ```

    Response includes:
    - Agent's text response
    - Linked conversation ID
    - Tool calls made and results
    - Generated/combined images
    """
    try:
        conversation_id = request.conversation_id
        user_id = request.user_id

        # Auto-create conversation if needed
        if not conversation_id and request.create_conversation:
            logger.info("📝 Creating new conversation for chat...")
            new_conv = await repo.create_conversation(
                user_id=user_id,
                title=request.message[:50] + "..." if len(request.message) > 50 else request.message
            )
            conversation_id = str(new_conv['id'])
            logger.info(f"✅ Created conversation: {conversation_id}")

        # Run chat with Pydantic AI agent
        logger.info(f"🤖 Processing message (conv: {conversation_id})")
        result = await chat_service.chat(
            message=request.message,
            conversation_id=conversation_id,
            user_id=user_id,
        )

        if result['status'] != 'success':
            logger.error(f"❌ Chat failed: {result.get('error')}")
            raise HTTPException(
                status_code=400,
                detail=result.get('error', 'Unknown error')
            )

        logger.info(f"✅ Chat completed for conversation: {conversation_id}")

        return ChatV2Response(
            status="success",
            response=result['response'],
            conversation_id=conversation_id or "unknown",
            tool_calls=[],  # Will be populated when tools are called
            images=[],      # Will be populated when images are generated
            metadata={
                "model": "pydantic-ai",
                "agent": "chat-v2",
                "user_id": user_id,
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error in chat-v2: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


# ============================================================================
# OPTIONAL: CONVERSATION CONTEXT ENDPOINT
# ============================================================================

@router.get("/{conversation_id}/context")
async def get_conversation_context(conversation_id: str):
    """
    Get conversation context for continuing chat

    Returns:
    - Conversation metadata
    - Recent messages (last 10)
    - Linked images
    - Agent state
    """
    try:
        conversation = await repo.get_conversation(conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        messages = await repo.get_conversation_messages(conversation_id)
        images = await repo.get_conversation_images(conversation_id)

        return {
            "status": "success",
            "conversation": {
                "id": str(conversation['id']),
                "title": conversation['title'],
                "created_at": conversation['created_at'],
                "updated_at": conversation['updated_at'],
                "is_favorite": conversation['is_favorite'],
            },
            "recent_messages": [
                {
                    "id": str(m['id']),
                    "role": m['role'],
                    "content": m['content'][:100],  # Preview
                    "created_at": m['created_at'],
                }
                for m in messages[:10]  # Last 10 messages
            ],
            "message_count": len(messages),
            "image_count": len(images),
            "images": [
                {
                    "id": str(img['id']),
                    "source": img['image_source'],
                    "prompt": img['prompt'],
                }
                for img in images[:5]  # Last 5 images
            ],
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting conversation context: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving conversation: {str(e)}"
        )
