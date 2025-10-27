"""
Conversation Repository - Supabase queries for conversation management
Handles all database operations for conversations and messages
"""

import logging
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from supabase import create_client, Client

logger = logging.getLogger(__name__)


class ConversationRepository:
    """Repository pattern for conversation database operations"""

    def __init__(self, supabase_url: str, supabase_key: str):
        """Initialize Supabase client"""
        self.client: Client = create_client(supabase_url, supabase_key)

    # ========================================================================
    # CONVERSATIONS CRUD
    # ========================================================================

    async def create_conversation(self, title: str = "Nueva Conversación", user_id: str = "daniel") -> dict:
        """
        Create a new conversation
        Returns: conversation object with id
        """
        try:
            response = self.client.table("conversations").insert({
                "title": title,
                "user_id": user_id,
                "is_favorite": False,
                "metadata": {}
            }).execute()

            if response.data:
                logger.info(f"✅ Created conversation: {response.data[0]['id']}")
                return response.data[0]
            else:
                raise Exception("No data returned from insert")

        except Exception as e:
            logger.error(f"❌ Error creating conversation: {e}")
            raise

    async def get_conversation(self, conversation_id: UUID, user_id: str = "daniel") -> Optional[dict]:
        """
        Get a single conversation by ID
        Verifies user ownership via RLS
        """
        try:
            response = self.client.table("conversations").select("*").eq(
                "id", str(conversation_id)
            ).eq("user_id", user_id).execute()

            if response.data:
                return response.data[0]
            return None

        except Exception as e:
            logger.error(f"❌ Error fetching conversation: {e}")
            raise

    async def list_conversations(self, user_id: str = "daniel", limit: int = 50) -> List[dict]:
        """
        List all conversations for user, ordered by most recent
        """
        try:
            response = self.client.table("conversations").select("*").eq(
                "user_id", user_id
            ).order("created_at", desc=True).limit(limit).execute()

            logger.info(f"✅ Fetched {len(response.data)} conversations")
            return response.data

        except Exception as e:
            logger.error(f"❌ Error listing conversations: {e}")
            raise

    async def update_conversation(self, conversation_id: UUID, updates: dict) -> dict:
        """
        Update conversation (title, is_favorite, metadata)
        """
        try:
            updates["updated_at"] = datetime.utcnow().isoformat()

            response = self.client.table("conversations").update(updates).eq(
                "id", str(conversation_id)
            ).execute()

            if response.data:
                logger.info(f"✅ Updated conversation: {conversation_id}")
                return response.data[0]
            else:
                raise Exception("Conversation not found")

        except Exception as e:
            logger.error(f"❌ Error updating conversation: {e}")
            raise

    async def delete_conversation(self, conversation_id: UUID) -> bool:
        """
        Delete conversation (cascades to messages and images)
        """
        try:
            response = self.client.table("conversations").delete().eq(
                "id", str(conversation_id)
            ).execute()

            logger.info(f"✅ Deleted conversation: {conversation_id}")
            return True

        except Exception as e:
            logger.error(f"❌ Error deleting conversation: {e}")
            raise

    # ========================================================================
    # CHAT MESSAGES CRUD
    # ========================================================================

    async def create_message(
        self,
        conversation_id: UUID,
        role: str,
        content: str,
        tool_used: Optional[str] = None,
        tool_result: Optional[dict] = None,
        reasoning_details: Optional[dict] = None,
        usage: Optional[dict] = None,
        model: Optional[str] = None
    ) -> dict:
        """
        Create a new message in a conversation
        """
        try:
            message_data = {
                "conversation_id": str(conversation_id),
                "role": role,
                "content": content,
                "tool_used": tool_used,
                "tool_result": tool_result,
                "reasoning_details": reasoning_details,
                "usage": usage or {},
                "model": model
            }

            response = self.client.table("chat_messages").insert(message_data).execute()

            if response.data:
                logger.info(f"✅ Created message in conversation: {conversation_id}")
                return response.data[0]
            else:
                raise Exception("No data returned from insert")

        except Exception as e:
            logger.error(f"❌ Error creating message: {e}")
            raise

    async def get_conversation_messages(
        self,
        conversation_id: UUID,
        limit: int = 100,
        offset: int = 0
    ) -> List[dict]:
        """
        Get all messages in a conversation (paginated)
        Ordered by created_at ascending (oldest first)
        """
        try:
            response = self.client.table("chat_messages").select("*").eq(
                "conversation_id", str(conversation_id)
            ).order("created_at", desc=False).range(offset, offset + limit - 1).execute()

            logger.info(f"✅ Fetched {len(response.data)} messages from conversation {conversation_id}")
            return response.data

        except Exception as e:
            logger.error(f"❌ Error fetching messages: {e}")
            raise

    async def delete_message(self, message_id: UUID) -> bool:
        """
        Delete a single message
        """
        try:
            self.client.table("chat_messages").delete().eq("id", str(message_id)).execute()
            logger.info(f"✅ Deleted message: {message_id}")
            return True

        except Exception as e:
            logger.error(f"❌ Error deleting message: {e}")
            raise

    # ========================================================================
    # CONVERSATION IMAGES
    # ========================================================================

    async def create_conversation_image(
        self,
        conversation_id: UUID,
        image_id: str,
        image_source: str,  # generated, combined, uploaded, created
        original_url: str,
        supabase_url: Optional[str] = None,
        prompt: Optional[str] = None,
        tool_used: Optional[str] = None,
        quality_score: Optional[float] = None,
        tags: Optional[List[str]] = None
    ) -> dict:
        """
        Link an image to a conversation
        """
        try:
            image_data = {
                "conversation_id": str(conversation_id),
                "image_id": image_id,
                "image_source": image_source,
                "original_url": original_url,
                "supabase_url": supabase_url,
                "prompt": prompt,
                "tool_used": tool_used,
                "quality_score": quality_score,
                "tags": tags or []
            }

            response = self.client.table("conversation_images").insert(image_data).execute()

            if response.data:
                logger.info(f"✅ Linked image to conversation: {conversation_id}")
                return response.data[0]
            else:
                raise Exception("No data returned from insert")

        except Exception as e:
            logger.error(f"❌ Error creating conversation image: {e}")
            raise

    async def get_conversation_images(self, conversation_id: UUID) -> List[dict]:
        """
        Get all images linked to a conversation
        """
        try:
            response = self.client.table("conversation_images").select("*").eq(
                "conversation_id", str(conversation_id)
            ).order("created_at", desc=True).execute()

            logger.info(f"✅ Fetched {len(response.data)} images from conversation")
            return response.data

        except Exception as e:
            logger.error(f"❌ Error fetching conversation images: {e}")
            raise

    # ========================================================================
    # HELPER METHODS
    # ========================================================================

    async def get_or_create_conversation(self, conversation_id: Optional[UUID], user_id: str = "daniel") -> dict:
        """
        Get existing conversation or create new one
        Used when user starts chat without selecting a conversation
        """
        if conversation_id:
            return await self.get_conversation(conversation_id, user_id)
        else:
            return await self.create_conversation(user_id=user_id)

    async def search_conversations(self, query: str, user_id: str = "daniel") -> List[dict]:
        """
        Search conversations by title (basic substring search)
        """
        try:
            # Supabase text search using ILIKE
            response = self.client.table("conversations").select("*").eq(
                "user_id", user_id
            ).ilike("title", f"%{query}%").order("created_at", desc=True).execute()

            logger.info(f"✅ Found {len(response.data)} conversations matching: {query}")
            return response.data

        except Exception as e:
            logger.error(f"❌ Error searching conversations: {e}")
            raise
