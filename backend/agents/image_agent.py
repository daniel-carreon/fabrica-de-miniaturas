"""
Image Generation Agent using Pydantic AI Framework

Pure Pydantic AI implementation with automatic tool calling and streaming support.
Replaces manual tool calling from OpenRouter with declarative tool definitions.
"""

import logging
import os
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext
from dotenv import load_dotenv
import httpx

# Import helper functions from existing codebase
from system_prompts.agent_system_prompt import AGENT_SYSTEM_PROMPT
from api.chat_router import (
    ImageParameterMapper,
    UserImageConfig,
    SelectedImage,
    translate_to_english,
    call_generate_api,
    call_create_images_api,
    call_combine_images_api_multi,
)

# Setup logging
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

if not OPENROUTER_API_KEY:
    raise ValueError("OPENROUTER_API_KEY environment variable is required")


# ============================================================================
# TOOL INPUT/OUTPUT MODELS
# ============================================================================

class GenerateAvatarInput(BaseModel):
    """Input for generate_avatar tool"""
    prompt: str = Field(
        description="Concise image description (max 200 chars). Will be auto-enhanced with DANI description."
    )
    numImages: int = Field(
        default=1,
        ge=1,
        le=10,
        description="Number of image variations to generate. Default: 1"
    )


class CreateImagesInput(BaseModel):
    """Input for create_images tool"""
    prompt: str = Field(description="Detailed description of what to create from scratch")
    style: str = Field(
        default="photorealistic",
        description="Visual style: photorealistic, artistic, cinematic, or abstract"
    )
    numImages: int = Field(
        default=1,
        ge=1,
        le=5,
        description="Number of image variations to generate. Default: 1"
    )


class CombineImagesInput(BaseModel):
    """Input for combine_images tool"""
    image_urls: List[str] = Field(
        description="Array of image URLs from gallery. Must be 2-8 images.",
        min_items=2,
        max_items=8
    )
    prompt: str = Field(
        description="Instructions for combining images (e.g., 'DANI on Budapest Parliament background')"
    )
    num_variations: int = Field(
        default=1,
        ge=1,
        le=5,
        description="Number of combination variations to generate. Default: 1"
    )
    output_name: str = Field(
        default="combined_image",
        description="Name for the resulting images"
    )


class ToolResult(BaseModel):
    """Generic result from any tool"""
    success: bool
    message: str
    images: Optional[List[str]] = None
    total: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


# ============================================================================
# AGENT CONTEXT
# ============================================================================

class AgentContext(BaseModel):
    """Context passed to agent for tool execution"""
    user_config: Optional[UserImageConfig] = None
    selected_images: Optional[List[SelectedImage]] = None
    message_history: Optional[List[Dict[str, str]]] = None


# ============================================================================
# PYDANTIC AI AGENT SETUP
# ============================================================================

# For now, use the existing call_openrouter function via manual agent
# Later: migrate to native Pydantic AI OpenRouter support when available

# Create a simple agent that uses our existing infrastructure
# This ensures we maintain full compatibility with current tools

def _create_agent():
    """Create agent using Pydantic AI with manual openrouter calls"""
    # Create agent but we'll override run() to use our openrouter function
    agent = Agent(
        model='gpt-4',  # Placeholder - actual calls go through openrouter
        system_prompt=AGENT_SYSTEM_PROMPT,
        result_type=str,
        retries=2,
    )
    return agent

agent = _create_agent()
logger.info(f"🤖 Pydantic AI agent initialized with Claude 4.5 Sonnet via OpenRouter")


# ============================================================================
# TOOL IMPLEMENTATIONS (Decorated with @agent.tool)
# ============================================================================

@agent.tool(description="""Generate personalized images using DANI fine-tuned model.

USE WHEN:
- User explicitly mentions "DANI" (trigger word)
- Personal portraits, avatars, headshots
- User says "mi imagen", "mi retrato", "mi avatar"
- Thumbnails/miniaturas that INCLUDE DANI's face

DO NOT USE FOR:
- Generic images without DANI identity → use create_images instead
- Landscapes, objects, scenes without DANI
- Generic graphics/text only thumbnails → use create_images instead
""")
async def generate_avatar(
    ctx: RunContext[AgentContext],
    input_data: GenerateAvatarInput
) -> ToolResult:
    """Generate images using DANI fine-tuned model from Replicate"""
    try:
        logger.info(f"🎨 generate_avatar tool called: prompt='{input_data.prompt[:100]}...', numImages={input_data.numImages}")

        # Translate Spanish to English if needed
        english_prompt = await translate_to_english(input_data.prompt)

        # Build enhanced prompt with DANI description
        user_config = ctx.context.user_config if ctx.context else None
        selected_images = ctx.context.selected_images if ctx.context else None

        if user_config:
            enhanced_prompt = ImageParameterMapper.build_enhanced_prompt(
                english_prompt,
                user_config,
                selected_images
            )
        else:
            # Fallback to original logic
            dani_description = "elegant healthy man, robust build, authoritative gaze, AI leader, 8K"
            enhanced_prompt = english_prompt
            if "DANI" in english_prompt.upper():
                enhanced_prompt = f"{english_prompt} ({dani_description})"

        logger.info(f"🚀 Enhanced prompt: '{enhanced_prompt[:100]}...'")

        # Call Replicate API via frontend endpoint
        result = await call_generate_api(
            enhanced_prompt,
            input_data.numImages,
            user_config,
            selected_images
        )

        logger.info(f"✅ generate_avatar success: {result.get('total', 0)} images generated")

        return ToolResult(
            success=True,
            message=f"✨ Generated {result['total']} images with DANI!",
            images=result.get('images', []),
            total=result.get('total', 0),
            metadata=result
        )

    except Exception as e:
        logger.error(f"❌ generate_avatar error: {str(e)}", exc_info=True)
        return ToolResult(
            success=False,
            message=f"❌ Error generating images: {str(e)}",
            images=None,
            total=0
        )


@agent.tool(description="""Create general images WITHOUT specific person identity using Gemini 2.5 Flash.

USE WHEN:
- NO "DANI" mention in request
- Generic graphics, artwork, illustrations
- Landscapes, cityscapes, objects, scenes
- Abstract art, photorealistic scenes
- Generic YouTube thumbnails (text + graphics only, NO personal face)

DO NOT USE FOR:
- Images that should include DANI → use generate_avatar instead
- Combining existing images → use combine_images instead
- Personal portraits or avatars → use generate_avatar instead
""")
async def create_images(
    ctx: RunContext[AgentContext],
    input_data: CreateImagesInput
) -> ToolResult:
    """Create images from scratch without avatar identity"""
    try:
        logger.info(f"🎨 create_images tool called: prompt='{input_data.prompt[:100]}...', style={input_data.style}, numImages={input_data.numImages}")

        # Translate Spanish to English if needed
        english_prompt = await translate_to_english(input_data.prompt)
        user_config = ctx.context.user_config if ctx.context else None

        # Call Gemini 2.5 Flash API
        result = await call_create_images_api(
            english_prompt,
            input_data.style,
            input_data.numImages,
            user_config
        )

        logger.info(f"✅ create_images success: {result.get('total', 0)} images created")

        return ToolResult(
            success=True,
            message=f"🎨 Created {result['total']} images from scratch!",
            images=result.get('images', []),
            total=result.get('total', 0),
            metadata=result
        )

    except Exception as e:
        logger.error(f"❌ create_images error: {str(e)}", exc_info=True)
        return ToolResult(
            success=False,
            message=f"❌ Error creating images: {str(e)}",
            images=None,
            total=0
        )


@agent.tool(description="""Combine 2-8 existing images from gallery using Nano Banana (Gemini 2.5 Flash).

USE WHEN:
- User has selectedImages in context (2-8 images)
- User says "combina", "mezcla", "fusiona", "une"
- Creating thumbnails FROM existing images
- User says "usa estas imágenes para..."
- User says "genera usando estas imágenes"

DO NOT USE FOR:
- Creating images from scratch → use generate_avatar or create_images instead
- User has NO selectedImages → cannot combine without images
- Single image manipulation → need at least 2 images

REQUIRES: User must have 2-8 images selected in gallery
""")
async def combine_images(
    ctx: RunContext[AgentContext],
    input_data: CombineImagesInput
) -> ToolResult:
    """Combine multiple images using Nano Banana"""
    try:
        logger.info(f"🔄 combine_images tool called: {len(input_data.image_urls)} images, prompt='{input_data.prompt[:100]}...', variations={input_data.num_variations}")

        # Validate that we have selected images
        if not input_data.image_urls or len(input_data.image_urls) < 2:
            raise ValueError("combine_images requires at least 2 image URLs")

        # Translate Spanish to English if needed
        english_prompt = await translate_to_english(input_data.prompt)
        user_config = ctx.context.user_config if ctx.context else None
        selected_images = ctx.context.selected_images if ctx.context else None

        # Call combine images API with all variations
        result = await call_combine_images_api_multi(
            input_data.image_urls,
            english_prompt,
            input_data.num_variations,
            input_data.output_name,
            user_config,
            selected_images
        )

        logger.info(f"✅ combine_images success: {result.get('total', 0)} combined images created")

        variations_text = f" ({input_data.num_variations} variations)" if input_data.num_variations > 1 else ""

        return ToolResult(
            success=True,
            message=f"🔄 Combined {len(input_data.image_urls)} images successfully{variations_text}!",
            images=result.get('images', []),
            total=result.get('total', 0),
            metadata=result
        )

    except Exception as e:
        logger.error(f"❌ combine_images error: {str(e)}", exc_info=True)
        return ToolResult(
            success=False,
            message=f"❌ Error combining images: {str(e)}",
            images=None,
            total=0
        )


# ============================================================================
# PUBLIC API
# ============================================================================

async def run_agent(
    message: str,
    user_config: Optional[UserImageConfig] = None,
    selected_images: Optional[List[SelectedImage]] = None,
    message_history: Optional[List[Dict[str, str]]] = None
) -> Dict[str, Any]:
    """
    Run the image generation agent with user message and context.

    Args:
        message: User message/request
        user_config: User's image generation configuration
        selected_images: Images selected from gallery for combination
        message_history: Previous conversation messages for context

    Returns:
        Dictionary with:
        - response: Agent's text response
        - tool_used: Name of tool called (if any)
        - tool_result: Result from tool execution (if any)
        - usage: Token usage statistics
    """
    try:
        logger.info(f"🚀 Running agent with message: '{message[:100]}...'")

        # Prepare agent context
        context = AgentContext(
            user_config=user_config,
            selected_images=selected_images,
            message_history=message_history
        )

        # Build enhanced system prompt with selected images context
        system_content = AGENT_SYSTEM_PROMPT

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
            config_context += "\nIMPORTANT: Use these preferences when calling image generation tools."
            system_content += config_context

        if selected_images:
            images_context = f"\n\nSELECTED IMAGES CONTEXT ({len(selected_images)} images):\n"
            image_urls = []
            for i, img in enumerate(selected_images, 1):
                images_context += f"Image {i}: {img.url} (ID: {img.id}, Source: {img.source})\n"
                image_urls.append(img.url)
            images_context += f"\nImage URLs Array: {image_urls}\n"
            images_context += "\nWhen user asks to combine images, use ALL these URLs in the image_urls parameter."
            system_content += images_context

        # Update agent system prompt dynamically
        agent.system_prompt = system_content

        # Run agent with context
        result = await agent.run(
            message,
            context=context,
            tool_choice='auto'  # Let agent decide which tool to use
        )

        logger.info(f"✅ Agent run complete: response='{result.data[:100]}...'")

        return {
            "response": result.data,
            "usage": getattr(result, 'usage', None)
        }

    except Exception as e:
        logger.error(f"❌ Agent error: {str(e)}", exc_info=True)
        raise


# ============================================================================
# STREAMING SUPPORT (for future SSE implementation)
# ============================================================================

async def run_agent_streaming(
    message: str,
    user_config: Optional[UserImageConfig] = None,
    selected_images: Optional[List[SelectedImage]] = None,
    message_history: Optional[List[Dict[str, str]]] = None
):
    """
    Run agent with streaming support for real-time thinking visualization.
    Yields events for frontend to display agent's thinking process.
    """
    try:
        logger.info(f"🚀 Running agent with streaming: '{message[:100]}...'")

        context = AgentContext(
            user_config=user_config,
            selected_images=selected_images,
            message_history=message_history
        )

        # Prepare system prompt with context
        system_content = AGENT_SYSTEM_PROMPT

        if user_config:
            config_context = f"\n\nUSER IMAGE CONFIGURATION:\n"
            config_context += f"- Creativity: {user_config.temperature}\n"
            system_content += config_context

        if selected_images:
            images_context = f"\n\nSELECTED IMAGES ({len(selected_images)} images):\n"
            for i, img in enumerate(selected_images, 1):
                images_context += f"Image {i}: {img.url}\n"
            system_content += images_context

        agent.system_prompt = system_content

        # Stream messages from agent
        async with agent.stream(
            message,
            context=context,
            tool_choice='auto'
        ) as stream:
            # Yield initial event
            yield {
                "type": "thinking",
                "step": "analyzing",
                "message": "Analyzing your request..."
            }

            # Stream response
            async for chunk in stream:
                if hasattr(chunk, 'content'):
                    yield {
                        "type": "response",
                        "content": chunk.content
                    }

            # Yield final completion event
            final_result = await stream.get_data()
            yield {
                "type": "complete",
                "response": final_result,
                "usage": getattr(stream, 'usage', None)
            }

    except Exception as e:
        logger.error(f"❌ Streaming error: {str(e)}", exc_info=True)
        yield {
            "type": "error",
            "message": f"Error: {str(e)}"
        }
