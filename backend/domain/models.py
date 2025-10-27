"""
SQLModel definitions for Conversation Manager
These models map directly to Supabase tables and support both ORM and API serialization
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from sqlmodel import SQLModel, Field, JSON
from pydantic import BaseModel, Field as PydanticField


# ============================================================================
# DATABASE MODELS (SQLModel - ORM + Pydantic)
# ============================================================================

class ConversationBase(SQLModel):
    """Base fields for Conversation model"""
    title: str = Field(index=True, default="Nueva Conversación")
    is_favorite: bool = Field(default=False, index=True)
    metadata: Optional[dict] = Field(default={}, sa_column_type=JSON)
    user_id: str = Field(default="daniel", index=True)


class Conversation(ConversationBase, table=True):
    """
    Database model for conversations table
    Represents a conversation session in minifab
    """
    __tablename__ = "conversations"

    id: UUID = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships (if using SQLModel with Relationships)
    messages: List["ChatMessage"] = []
    images: List["ConversationImage"] = []


class ConversationCreate(ConversationBase):
    """Request model for creating a conversation"""
    pass


class ConversationUpdate(SQLModel):
    """Request model for updating a conversation"""
    title: Optional[str] = None
    is_favorite: Optional[bool] = None
    metadata: Optional[dict] = None


class ConversationRead(ConversationBase):
    """Response model for reading a conversation"""
    id: UUID
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = 0  # Could be computed


# ============================================================================

class ChatMessageBase(SQLModel):
    """Base fields for ChatMessage model"""
    role: str = Field(index=True)  # user, assistant, system
    content: str
    tool_used: Optional[str] = Field(default=None, index=True)
    tool_arguments: Optional[dict] = Field(default=None, sa_column_type=JSON)
    tool_result: Optional[dict] = Field(default=None, sa_column_type=JSON)
    reasoning_details: Optional[dict] = Field(default=None, sa_column_type=JSON)
    usage: Optional[dict] = Field(default={}, sa_column_type=JSON)  # Token usage
    model: Optional[str] = None


class ChatMessage(ChatMessageBase, table=True):
    """
    Database model for chat_messages table
    Represents a single message in a conversation
    """
    __tablename__ = "chat_messages"

    id: UUID = Field(default=None, primary_key=True)
    conversation_id: UUID = Field(foreign_key="conversations.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    message_index: Optional[int] = None

    # Relationship
    conversation: Optional[Conversation] = None


class ChatMessageCreate(ChatMessageBase):
    """Request model for creating a chat message"""
    conversation_id: UUID


class ChatMessageRead(ChatMessageBase):
    """Response model for reading a chat message"""
    id: UUID
    conversation_id: UUID
    created_at: datetime
    message_index: Optional[int] = None


# ============================================================================

class ConversationImageBase(SQLModel):
    """Base fields for ConversationImage model"""
    image_id: str
    image_source: str  # generated, combined, uploaded, created
    original_url: str
    supabase_url: Optional[str] = None
    prompt: Optional[str] = None
    tool_used: Optional[str] = Field(default=None, index=True)
    tags: Optional[List[str]] = Field(default=[], sa_column_type=JSON)
    quality_score: Optional[float] = None


class ConversationImage(ConversationImageBase, table=True):
    """
    Database model for conversation_images table
    Links images to conversations
    """
    __tablename__ = "conversation_images"

    id: UUID = Field(default=None, primary_key=True)
    conversation_id: Optional[UUID] = Field(
        default=None,
        foreign_key="conversations.id",
        index=True
    )
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    # Relationship
    conversation: Optional[Conversation] = None


class ConversationImageCreate(ConversationImageBase):
    """Request model for creating a conversation image link"""
    conversation_id: Optional[UUID] = None


class ConversationImageRead(ConversationImageBase):
    """Response model for reading a conversation image link"""
    id: UUID
    conversation_id: Optional[UUID]
    created_at: datetime


# ============================================================================
# API MODELS (Pydantic - for request/response serialization)
# ============================================================================

class ChatRequest(BaseModel):
    """Chat request with conversation context"""
    message: str
    conversation_id: Optional[UUID] = None  # If None, creates new conversation
    messages: List[dict] = PydanticField(default=[], description="Message history")
    selectedImages: List[dict] = PydanticField(default=[], description="Selected images for combination")


class ChatResponse(BaseModel):
    """Chat response with full context"""
    response: str
    conversation_id: UUID
    message_id: UUID
    tool_used: Optional[str] = None
    tool_result: Optional[dict] = None
    usage: Optional[dict] = None


class ConversationListResponse(BaseModel):
    """List of conversations for UI sidebar"""
    total: int
    conversations: List[ConversationRead]


class ConversationMessagesResponse(BaseModel):
    """Messages in a conversation"""
    conversation_id: UUID
    total: int
    messages: List[ChatMessageRead]
