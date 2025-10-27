"""
Chat Service - Pydantic AI Agent Implementation
Provides conversation-aware chat agent with tool calling for image generation and combination
"""

import logging
import os
from typing import Optional
from pydantic_ai import Agent, RunContext, ModelSettings
from pydantic_ai.models.openrouter import OpenRouterModel

from domain.models import (
    ConversationCreate,
    ChatMessageCreate,
    ConversationImageCreate
)
from infrastructure.conversation_repository import ConversationRepository

logger = logging.getLogger(__name__)


class ChatDependencies:
    """Dependencies injected into Pydantic AI agent"""

    def __init__(self, repo: ConversationRepository, user_id: str = 'daniel'):
        self.repo = repo
        self.user_id = user_id
        self.conversation_id: Optional[str] = None


# System prompt template for the agent
SYSTEM_PROMPT = """You are DANI, an expert thumbnail and miniature creator. Your purpose is to help create professional, eye-catching thumbnails for YouTube and social media using advanced image generation and combination techniques.

You have access to two main tools:
1. **generate_images**: Creates 1-8 professional thumbnail images using Flux Dev with your custom DANI LoRA (fine-tuned identity)
2. **combine_images**: Blends 2 or more existing images together to create composite thumbnails using Nano Banana

When a user asks to generate thumbnails:
- Ask clarifying questions about style, mood, and composition
- Generate 3-5 variations if not specified
- Suggest combining complementary images for better results

When combining images:
- Analyze the source images first
- Suggest composition improvements
- Create seamless blends that maintain visual coherence

Always aim for professional-quality thumbnails optimized for YouTube and social media platforms."""


class ChatService:
    """Service for managing Pydantic AI chat agent"""

    def __init__(self, repo: ConversationRepository):
        self.repo = repo
        self.agent = self._initialize_agent()

    def _initialize_agent(self) -> Agent[ChatDependencies]:
        """Initialize Pydantic AI agent with tools"""

        # Create agent with OpenRouter model
        agent = Agent[ChatDependencies](
            model=self._get_model(),
            instructions=SYSTEM_PROMPT,
            system_prompt_template='User: {user_id} | Conversation: {conversation_id}',
        )

        # Register tool: generate_images
        @agent.tool
        async def generate_images(
            ctx: RunContext[ChatDependencies],
            prompt: str,
            count: int = 3,
            style: str = 'professional thumbnail'
        ) -> dict:
            """
            Generate professional thumbnail images using Flux Dev with DANI LoRA.

            Args:
                prompt: Detailed description of the thumbnail style and content
                count: Number of images to generate (1-8, default 3)
                style: Visual style preference (professional, cinematic, minimalist, etc.)

            Returns:
                Dictionary with generated image URLs and metadata
            """
            try:
                logger.info(f"🎨 Generating {count} images with prompt: {prompt[:50]}...")

                # Call Replicate API via backend chat endpoint
                # This is a placeholder - actual implementation delegates to existing /chat endpoint
                result = {
                    'status': 'success',
                    'count': count,
                    'prompt': prompt,
                    'style': style,
                    'tool_used': 'generate_images',
                    'images': []  # Will be populated by actual Replicate call
                }

                # Save to conversation if context has conversation_id
                if ctx.deps.conversation_id:
                    await ctx.deps.repo.create_conversation_image(
                        conversation_id=ctx.deps.conversation_id,
                        image_id=f"gen-{ctx.deps.user_id}-{int(__import__('time').time())}",
                        image_source='generated',
                        original_url='',  # Will be set after Replicate returns
                        prompt=prompt,
                        tool_used='generate_images'
                    )

                return result

            except Exception as e:
                logger.error(f"❌ Error generating images: {str(e)}")
                return {
                    'status': 'error',
                    'error': str(e),
                    'tool_used': 'generate_images'
                }

        # Register tool: combine_images
        @agent.tool
        async def combine_images(
            ctx: RunContext[ChatDependencies],
            image_urls: list[str],
            prompt: str,
            blend_mode: str = 'seamless'
        ) -> dict:
            """
            Combine multiple images into a professional composite thumbnail using Nano Banana.

            Args:
                image_urls: List of 2-8 image URLs to combine
                prompt: Detailed instruction for how to combine the images
                blend_mode: Blending technique (seamless, overlay, composition)

            Returns:
                Dictionary with combined image URL and metadata
            """
            try:
                if len(image_urls) < 2:
                    return {
                        'status': 'error',
                        'error': 'Need at least 2 images to combine',
                        'tool_used': 'combine_images'
                    }

                if len(image_urls) > 8:
                    return {
                        'status': 'error',
                        'error': 'Cannot combine more than 8 images',
                        'tool_used': 'combine_images'
                    }

                logger.info(f"🔄 Combining {len(image_urls)} images with prompt: {prompt[:50]}...")

                result = {
                    'status': 'success',
                    'count': len(image_urls),
                    'blend_mode': blend_mode,
                    'prompt': prompt,
                    'tool_used': 'combine_images',
                    'image_url': '',  # Will be populated by actual Nano Banana call
                }

                # Save to conversation if context has conversation_id
                if ctx.deps.conversation_id:
                    await ctx.deps.repo.create_conversation_image(
                        conversation_id=ctx.deps.conversation_id,
                        image_id=f"comb-{ctx.deps.user_id}-{int(__import__('time').time())}",
                        image_source='combined',
                        original_url='',  # Will be set after Nano Banana returns
                        prompt=prompt,
                        tool_used='combine_images'
                    )

                return result

            except Exception as e:
                logger.error(f"❌ Error combining images: {str(e)}")
                return {
                    'status': 'error',
                    'error': str(e),
                    'tool_used': 'combine_images'
                }

        return agent

    def _get_model(self):
        """Get the model configuration based on environment"""
        model_config = os.getenv('LLM_MODEL', 'openrouter:gpt-5-mini')

        if model_config.startswith('openrouter:'):
            model_name = model_config.replace('openrouter:', '')
            api_key = os.getenv('OPENROUTER_API_KEY')

            if not api_key:
                logger.warning("OPENROUTER_API_KEY not set, using default model")
                return 'openrouter:gpt-5-mini'

            return OpenRouterModel(
                model_id=model_name,
                api_key=api_key,
            )

        return model_config

    async def chat(
        self,
        message: str,
        conversation_id: Optional[str] = None,
        user_id: str = 'daniel',
        **kwargs
    ) -> dict:
        """
        Run chat agent with conversation context

        Args:
            message: User message
            conversation_id: Optional conversation ID to link messages
            user_id: User identifier
            **kwargs: Additional parameters

        Returns:
            Dictionary with agent response and tool calls
        """
        try:
            # Set up dependencies
            deps = ChatDependencies(repo=self.repo, user_id=user_id)
            deps.conversation_id = conversation_id

            # Run agent
            result = await self.agent.run(
                message,
                deps=deps,
                model_settings=ModelSettings(
                    temperature=0.7,
                    max_tokens=1500,
                ),
            )

            # Log to conversation if linked
            if conversation_id:
                # Save user message
                await self.repo.create_message(
                    conversation_id=conversation_id,
                    role='user',
                    content=message,
                    tool_used=None,
                )

                # Save assistant response
                await self.repo.create_message(
                    conversation_id=conversation_id,
                    role='assistant',
                    content=str(result.data),
                    tool_used=None,  # Tool calls are separate
                )

            return {
                'status': 'success',
                'response': str(result.data),
                'conversation_id': conversation_id,
                'user_id': user_id,
            }

        except Exception as e:
            logger.error(f"❌ Chat error: {str(e)}")
            return {
                'status': 'error',
                'error': str(e),
                'conversation_id': conversation_id,
            }
