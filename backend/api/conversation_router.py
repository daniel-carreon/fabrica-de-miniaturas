"""
Conversation Router - REST API endpoints for conversation management
Provides CRUD operations for conversations, messages, and conversation images
"""

import logging
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import os
from dotenv import load_dotenv

from domain.models import (
    ConversationCreate,
    ConversationRead,
    ConversationUpdate,
    ChatMessageCreate,
    ChatMessageRead,
    ConversationListResponse,
    ConversationMessagesResponse,
    ConversationImageCreate,
    ConversationImageRead
)
from infrastructure.conversation_repository import ConversationRepository

load_dotenv()

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/conversations", tags=["conversations"])

# Initialize repository
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_ANON_KEY")
repo = ConversationRepository(supabase_url, supabase_key)

# Default user (single-user setup for now)
DEFAULT_USER = "daniel"


# ============================================================================
# CONVERSATIONS ENDPOINTS
# ============================================================================

@router.post("", response_model=ConversationRead)
async def create_conversation(conversation: ConversationCreate):
    """
    Create a new conversation
    Auto-generates title from first message or uses provided title
    """
    try:
        result = await repo.create_conversation(
            title=conversation.title,
            user_id=DEFAULT_USER
        )
        logger.info(f"✅ Created conversation: {result['id']}")
        return result

    except Exception as e:
        logger.error(f"❌ Error creating conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=ConversationListResponse)
async def list_conversations(limit: int = Query(50, ge=1, le=100)):
    """
    List all conversations for current user
    Sorted by most recent first
    """
    try:
        conversations = await repo.list_conversations(
            user_id=DEFAULT_USER,
            limit=limit
        )
        return ConversationListResponse(
            total=len(conversations),
            conversations=conversations
        )

    except Exception as e:
        logger.error(f"❌ Error listing conversations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{conversation_id}", response_model=ConversationRead)
async def get_conversation(conversation_id: UUID):
    """
    Get a single conversation by ID
    """
    try:
        conversation = await repo.get_conversation(
            conversation_id=conversation_id,
            user_id=DEFAULT_USER
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        return conversation

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{conversation_id}", response_model=ConversationRead)
async def update_conversation(conversation_id: UUID, updates: ConversationUpdate):
    """
    Update a conversation (title, is_favorite, metadata)
    """
    try:
        # Verify user ownership
        conversation = await repo.get_conversation(
            conversation_id=conversation_id,
            user_id=DEFAULT_USER
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # Only update provided fields
        update_data = updates.dict(exclude_unset=True)

        result = await repo.update_conversation(
            conversation_id=conversation_id,
            updates=update_data
        )
        logger.info(f"✅ Updated conversation: {conversation_id}")
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{conversation_id}")
async def delete_conversation(conversation_id: UUID):
    """
    Delete a conversation (cascades to messages and images)
    """
    try:
        # Verify user ownership
        conversation = await repo.get_conversation(
            conversation_id=conversation_id,
            user_id=DEFAULT_USER
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        await repo.delete_conversation(conversation_id=conversation_id)
        logger.info(f"✅ Deleted conversation: {conversation_id}")
        return {"status": "deleted", "conversation_id": str(conversation_id)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting conversation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{conversation_id}/search")
async def search_conversations(query: str = Query(..., min_length=1)):
    """
    Search conversations by title
    """
    try:
        results = await repo.search_conversations(
            query=query,
            user_id=DEFAULT_USER
        )
        return {
            "query": query,
            "total": len(results),
            "conversations": results
        }

    except Exception as e:
        logger.error(f"❌ Error searching conversations: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# CHAT MESSAGES ENDPOINTS
# ============================================================================

@router.get("/{conversation_id}/messages", response_model=ConversationMessagesResponse)
async def get_conversation_messages(
    conversation_id: UUID,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """
    Get all messages in a conversation (paginated)
    Ordered by oldest first (for chat display)
    """
    try:
        # Verify conversation exists and user owns it
        conversation = await repo.get_conversation(
            conversation_id=conversation_id,
            user_id=DEFAULT_USER
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        messages = await repo.get_conversation_messages(
            conversation_id=conversation_id,
            limit=limit,
            offset=offset
        )

        return ConversationMessagesResponse(
            conversation_id=conversation_id,
            total=len(messages),
            messages=messages
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{conversation_id}/messages", response_model=ChatMessageRead)
async def create_message(
    conversation_id: UUID,
    message: ChatMessageCreate
):
    """
    Create a new message in a conversation
    Used by chat endpoint to persist messages
    """
    try:
        # Verify conversation exists
        conversation = await repo.get_conversation(
            conversation_id=conversation_id,
            user_id=DEFAULT_USER
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        result = await repo.create_message(
            conversation_id=conversation_id,
            role=message.role,
            content=message.content,
            tool_used=message.tool_used,
            tool_result=message.tool_result,
            reasoning_details=message.reasoning_details,
            usage=message.usage,
            model=message.model
        )

        logger.info(f"✅ Created message in conversation: {conversation_id}")
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error creating message: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{conversation_id}/messages/{message_id}")
async def delete_message(conversation_id: UUID, message_id: UUID):
    """
    Delete a single message from a conversation
    """
    try:
        await repo.delete_message(message_id=message_id)
        logger.info(f"✅ Deleted message: {message_id}")
        return {"status": "deleted", "message_id": str(message_id)}

    except Exception as e:
        logger.error(f"❌ Error deleting message: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# CONVERSATION IMAGES ENDPOINTS
# ============================================================================

@router.get("/{conversation_id}/images")
async def get_conversation_images(conversation_id: UUID):
    """
    Get all images linked to a conversation
    """
    try:
        # Verify conversation exists
        conversation = await repo.get_conversation(
            conversation_id=conversation_id,
            user_id=DEFAULT_USER
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        images = await repo.get_conversation_images(conversation_id=conversation_id)

        return {
            "conversation_id": conversation_id,
            "total": len(images),
            "images": images
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching images: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{conversation_id}/images")
async def link_image_to_conversation(
    conversation_id: UUID,
    image: ConversationImageCreate
):
    """
    Link an image to a conversation
    Called when image is generated/combined in a conversation
    """
    try:
        # Verify conversation exists
        conversation = await repo.get_conversation(
            conversation_id=conversation_id,
            user_id=DEFAULT_USER
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        result = await repo.create_conversation_image(
            conversation_id=conversation_id,
            image_id=image.image_id,
            image_source=image.image_source,
            original_url=image.original_url,
            supabase_url=image.supabase_url,
            prompt=image.prompt,
            tool_used=image.tool_used,
            quality_score=image.quality_score,
            tags=image.tags
        )

        logger.info(f"✅ Linked image to conversation: {conversation_id}")
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error linking image: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# HEALTH CHECK
# ============================================================================

@router.get("/health", include_in_schema=False)
async def health():
    """Health check for conversation service"""
    return {"status": "healthy", "service": "conversation_manager"}
