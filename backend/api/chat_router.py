"""
Chat Agent Router - AI Agent with Tool Calling in FastAPI
Migrated from Next.js for better AI scalability
"""
import json
import logging
import time
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, validator
from typing import Literal
import httpx
from system_prompts.agent_system_prompt import AGENT_SYSTEM_PROMPT

logger = logging.getLogger(__name__)
router = APIRouter()

class ChatMessage(BaseModel):
    id: str
    role: str
    content: str
    timestamp: str

class SelectedImage(BaseModel):
    id: str
    url: str
    source: str

class UserImageConfig(BaseModel):
    """Simplified user configuration for image generation - Pareto 80/20 approach"""

    class Config:
        extra = "ignore"  # Ignore obsolete fields from old localStorage (character_consistency, etc.)

    # TIER 1: Critical Parameters (directly used by Nano Banana API)
    temperature: float = Field(
        default=0.3,
        ge=0.1,
        le=1.0,
        description="Creativity level (0.1=precise, 1.0=creative)"
    )
    seed: Optional[int] = Field(
        default=None,
        description="Seed for reproducible results (optional)"
    )

    # TIER 2: Advanced Parameters (only affect prompt enhancement)
    style_preset: Optional[Literal['photorealistic', 'artistic', 'cinematic', 'portrait']] = Field(
        default='photorealistic',
        description="Overall visual style (prompt enhancement only)"
    )
    lighting_preference: Optional[Literal['studio', 'natural', 'dramatic', 'soft']] = Field(
        default='studio',
        description="Lighting style (prompt enhancement only)"
    )
    mood: Optional[Literal['professional', 'casual', 'dynamic', 'authoritative', 'friendly']] = Field(
        default='professional',
        description="Overall mood and tone (prompt enhancement only)"
    )

    @validator('temperature')
    def validate_temperature(cls, v):
        if not 0.1 <= v <= 1.0:
            raise ValueError('Temperature must be between 0.1 and 1.0')
        return v

class ChatRequest(BaseModel):
    message: str
    messages: List[ChatMessage] = []
    selectedImages: List[SelectedImage] = []
    userConfig: Optional[UserImageConfig] = Field(
        default=None,
        description="User configuration for image generation parameters"
    )

class ChatResponse(BaseModel):
    response: str
    tool_used: Optional[str] = None
    tool_result: Optional[Dict[str, Any]] = None
    usage: Optional[Dict[str, Any]] = None
    model: Optional[str] = None
    reasoning_details: Optional[List[Dict[str, Any]]] = None

# OpenRouter config from environment variables
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")  # Dynamic frontend URL

if not OPENROUTER_API_KEY:
    raise ValueError("OPENROUTER_API_KEY environment variable is required")

# Tool definition
TOOLS = [
{
    "type": "function",
    "function": {
        "name": "generate_avatar",
        "description": "Generate personalized avatar images using the DANI fine-tuned model (for portraits with Daniel's identity)",
        "parameters": {
            "type": "object",
            "properties": {
                "prompt": {"type": "string", "description": "Image description"},
                "numImages": {"type": "integer", "minimum": 1, "maximum": 10, "default": 3}
            },
            "required": ["prompt"]
        }
    }
},
{
    "type": "function",
    "function": {
        "name": "create_images",
        "description": "Create general images from scratch without specific identity (landscapes, objects, scenes, thumbnails, artwork - use when NO \"DANI\" mentioned)",
        "parameters": {
            "type": "object",
            "properties": {
                "prompt": {"type": "string", "description": "Image description for creating from scratch"},
                "style": {"type": "string", "enum": ["photorealistic", "artistic", "cinematic", "abstract"], "default": "photorealistic", "description": "Visual style for the generated image"},
                "numImages": {"type": "integer", "minimum": 1, "maximum": 5, "default": 2}
            },
            "required": ["prompt"]
        }
    }
},
{
    "type": "function",
    "function": {
        "name": "combine_images",
        "description": "Combine multiple existing images from the gallery using Nano Banana (Gemini 2.5 Flash). Can handle 2-8 images and generate multiple variations.",
        "parameters": {
            "type": "object",
            "properties": {
                "image_urls": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Array of image URLs to combine (minimum 2, maximum 8 images)",
                    "minItems": 2,
                    "maxItems": 8
                },
                "prompt": {"type": "string", "description": "Instructions for how to combine the images"},
                "num_variations": {"type": "integer", "minimum": 1, "maximum": 5, "default": 1, "description": "Number of different combination variations to generate"},
                "output_name": {"type": "string", "description": "Name for the resulting combined images", "default": "combined_image"}
            },
            "required": ["image_urls", "prompt"]
        }
    }
}]

# System prompt imported from dedicated file for easy maintenance
SYSTEM_PROMPT = AGENT_SYSTEM_PROMPT

class ImageParameterMapper:
    """Converts simplified user configuration to model-specific parameters"""

    @staticmethod
    def build_style_instructions(config: UserImageConfig) -> str:
        """Build style and mood instructions from simplified config"""
        if not config:
            return "photorealistic style with professional lighting"

        instructions = []

        # Style preset (if provided)
        if config.style_preset:
            style_map = {
                'photorealistic': "highly detailed photorealistic style, sharp focus, professional photography",
                'artistic': "artistic interpretation, stylized rendering, creative visual approach",
                'cinematic': "cinematic composition, dramatic lighting, movie-like quality",
                'portrait': "portrait photography style, focused on facial features and expression"
            }
            instructions.append(style_map.get(config.style_preset, style_map['photorealistic']))

        # Lighting preference (if provided)
        if config.lighting_preference:
            lighting_map = {
                'studio': "professional studio lighting, even illumination, soft shadows",
                'natural': "natural lighting, realistic environmental illumination",
                'dramatic': "dramatic lighting with strong contrasts, dynamic shadows",
                'soft': "soft diffused lighting, gentle shadows, warm ambiance"
            }
            instructions.append(lighting_map.get(config.lighting_preference, lighting_map['studio']))

        # Mood (if provided)
        if config.mood:
            mood_map = {
                'professional': "professional demeanor, confident and authoritative presence",
                'casual': "relaxed and approachable, casual atmosphere",
                'dynamic': "energetic and dynamic, action-oriented composition",
                'authoritative': "commanding presence, leadership qualities emphasized",
                'friendly': "warm and approachable, friendly expression"
            }
            instructions.append(mood_map.get(config.mood, mood_map['professional']))

        return ", ".join(instructions) if instructions else "photorealistic style with professional lighting"

    @staticmethod
    def build_nano_banana_parameters(config: UserImageConfig) -> Dict[str, Any]:
        """Convert user config to Nano Banana API parameters"""
        if not config:
            return {"temperature": 0.3}

        params = {
            "temperature": config.temperature,
            "max_tokens": 1500,
        }

        # Add seed if specified
        if config.seed:
            params["seed"] = config.seed

        return params

    @staticmethod
    def build_enhanced_prompt(base_prompt: str, config: UserImageConfig, selected_images: List[SelectedImage] = None) -> str:
        """Build enhanced prompt combining base prompt with simplified user configuration"""
        if not config:
            return base_prompt

        # Start with base prompt
        enhanced_parts = [base_prompt]

        # Add style instructions (only if advanced params provided)
        style_instruction = ImageParameterMapper.build_style_instructions(config)
        if style_instruction and style_instruction != "photorealistic style with professional lighting":
            enhanced_parts.append(style_instruction)

        # Join with proper punctuation
        enhanced_prompt = ". ".join(enhanced_parts)

        # Ensure proper ending
        if not enhanced_prompt.endswith('.'):
            enhanced_prompt += '.'

        return enhanced_prompt

async def translate_to_english(text: str) -> str:
    """Smart translation: Translate Spanish instructions but preserve Spanish text in quotes for thumbnails"""
    # Simple detection - if contains Spanish words, translate
    spanish_indicators = ['imagen', 'imagenes', 'genera', 'generame', 'combina', 'mezcla', 'fusiona', 'miniatura', 'fondo', 'texto', 'estilo', 'con', 'para', 'que', 'una', 'unas', 'estas', 'este']

    if any(word in text.lower() for word in spanish_indicators):
        # Check if it's a thumbnail/miniatura context
        is_thumbnail = 'miniatura' in text.lower() or 'thumbnail' in text.lower()
        logger.info(f"🌍 Detected Spanish{'(thumbnail context)' if is_thumbnail else ''}, smart translating: '{text[:50]}...'")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    'Authorization': f'Bearer {OPENROUTER_API_KEY}',
                    'Content-Type': 'application/json',
                    'HTTP-Referer': FRONTEND_URL,
                    'X-Title': 'Daniel Flux Context - Smart Translator'
                },
                json={
                    "model": "openai/gpt-4o",
                    "messages": [
                        {"role": "system", "content": "Translate Spanish instructions to English but PRESERVE Spanish text that should appear in the final image. Rules: 1) Translate instructions/descriptions 2) KEEP Spanish text in quotes EXACTLY as written 3) For thumbnails/miniaturas, preserve display text in Spanish. Example: 'miniatura con texto \"APRENDE PYTHON\"' → 'thumbnail with text \"APRENDE PYTHON\"' (Spanish text preserved). Only return the translation."},
                        {"role": "user", "content": text}
                    ],
                    "max_tokens": 500,
                    "temperature": 0.1
                },
                timeout=30.0
            )
            response.raise_for_status()
            result = response.json()
            translated = result.get("choices", [{}])[0].get("message", {}).get("content", text)
            logger.info(f"✅ Smart translated to: '{translated[:50]}...'")
            return translated.strip()

    return text

async def call_openrouter(messages: List[Dict[str, str]]) -> Dict[str, Any]:
    """Call OpenRouter API with robust error handling"""
    try:
        logger.info(f"🚀 Calling OpenRouter with {len(messages)} messages")

        async with httpx.AsyncClient() as client:
            payload = {
                "model": "openai/gpt-4o",  # Using stable model instead of gpt-5
                "messages": messages,
                "tools": TOOLS,
                "tool_choice": "auto",
                "max_tokens": 5000,  # Increased for long URL arrays
                "reasoning": {
                    "effort": "medium",  # Optimal balance for tool calling
                    "verbosity": 0.7,    # Detailed but not verbose responses
                    "exclude": False     # Show reasoning process to user
                },
                "temperature": 0.1,
                "top_p": 0.5
            }

            logger.info(f"📤 OpenRouter payload: model={payload['model']}, messages={len(payload['messages'])}, tools={len(payload['tools'])}")

            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    'Authorization': f'Bearer {OPENROUTER_API_KEY}',
                    'Content-Type': 'application/json',
                    'HTTP-Referer': FRONTEND_URL,
                    'X-Title': 'Daniel Flux Context'
                },
                json=payload,
                timeout=60.0
            )

            logger.info(f"📥 OpenRouter response: status={response.status_code}")

            if response.status_code != 200:
                error_text = response.text
                logger.error(f"❌ OpenRouter error {response.status_code}: {error_text}")
                raise HTTPException(status_code=response.status_code, detail=f"OpenRouter API error: {error_text}")

            result = response.json()
            logger.info(f"✅ OpenRouter success: {list(result.keys())}")
            return result

    except httpx.TimeoutException:
        logger.error("⏰ OpenRouter timeout")
        raise HTTPException(status_code=408, detail="OpenRouter API timeout")
    except httpx.RequestError as e:
        logger.error(f"🌐 OpenRouter connection error: {e}")
        raise HTTPException(status_code=503, detail=f"OpenRouter connection error: {str(e)}")
    except Exception as e:
        logger.error(f"💥 OpenRouter unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"OpenRouter error: {str(e)}")

async def call_generate_api(prompt: str, num_images: int = 3, user_config: UserImageConfig = None, selected_images: List[SelectedImage] = None) -> Dict[str, Any]:
    """Call frontend generate API with enhanced DANI description and user configuration"""
    # Translate Spanish to English first
    english_prompt = await translate_to_english(prompt)

    # Build enhanced prompt using user configuration
    if user_config:
        enhanced_prompt = ImageParameterMapper.build_enhanced_prompt(
            english_prompt,
            user_config,
            selected_images
        )
        logger.info(f"🎨 Using user config: style={user_config.style_preset}, temp={user_config.temperature}")
    else:
        # Fallback to original logic for backwards compatibility
        dani_description = "elegant healthy man, robust build, authoritative gaze, AI leader, 8K"
        enhanced_prompt = english_prompt
        if "DANI" in english_prompt.upper():
            enhanced_prompt = f"{english_prompt} ({dani_description})"

    logger.info(f"🚀 Calling Replicate with enhanced prompt: '{enhanced_prompt[:100]}...' and {num_images} images")

    try:
        async with httpx.AsyncClient() as client:
            url = f"{FRONTEND_URL}/api/generate"
            payload = {"prompt": enhanced_prompt, "numImages": num_images}

            logger.info(f"📡 POST {url}")
            logger.info(f"📦 Payload: {payload}")

            response = await client.post(
                url,
                headers={'Content-Type': 'application/json'},
                json=payload,
                timeout=120.0
            )

            logger.info(f"📥 Response status: {response.status_code}")

            if response.status_code != 200:
                logger.error(f"❌ Generate API failed: {response.status_code}")
                logger.error(f"❌ Response text: {response.text}")
                response.raise_for_status()

            result = response.json()
            logger.info(f"✅ Generate API success: {result.get('total', 0)} images generated")
            return result

    except Exception as e:
        logger.error(f"💥 Exception calling generate API: {str(e)}")
        logger.error(f"💥 Exception type: {type(e)}")
        raise

async def call_create_images_api(prompt: str, style: str = "photorealistic", num_images: int = 2, user_config: UserImageConfig = None) -> Dict[str, Any]:
    """Create images from scratch using Gemini 2.5 Flash (without avatar)"""
    logger.info(f"🎨 Creating images from scratch: '{prompt[:100]}...' Style: {style}, Count: {num_images}")

    try:
        # Translate Spanish to English first
        english_prompt = await translate_to_english(prompt)

        # Build style-enhanced prompt
        style_instructions = {
            "photorealistic": "highly detailed photorealistic image, sharp focus, professional photography",
            "artistic": "artistic interpretation, stylized rendering, creative visual approach",
            "cinematic": "cinematic composition, dramatic lighting, movie-like quality",
            "abstract": "abstract art style, creative interpretation, artistic freedom"
        }

        style_instruction = style_instructions.get(style, style_instructions["photorealistic"])
        enhanced_prompt = f"CREATE AND GENERATE: {english_prompt}. Style: {style_instruction}. IMPORTANT: Generate a visual image, not text."

        logger.info(f"🚀 Calling Gemini 2.5 Flash for image creation...")

        # Use OpenRouter with Gemini 2.5 Flash for image generation
        async with httpx.AsyncClient() as client:
            payload = {
                "model": "google/gemini-2.5-flash-image-preview",
                "messages": [
                    {
                        "role": "user",
                        "content": enhanced_prompt
                    }
                ],
                "modalities": ["image", "text"],
                "temperature": user_config.temperature if user_config else 0.7,
                "max_tokens": 1500
            }

            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    'Authorization': f'Bearer {OPENROUTER_API_KEY}',
                    'Content-Type': 'application/json',
                    'HTTP-Referer': FRONTEND_URL,
                    'X-Title': 'Daniel Flux Context - Create Images'
                },
                json=payload,
                timeout=120.0
            )

            logger.info(f"📥 Gemini response status: {response.status_code}")

            if response.status_code != 200:
                logger.error(f"❌ Gemini failed: {response.status_code}")
                logger.error(f"❌ Response: {response.text}")
                response.raise_for_status()

            result = response.json()
            logger.info(f"✅ Gemini create images success!")

            # Extract generated images from response
            images = []
            if result.get("choices") and len(result["choices"]) > 0:
                message = result["choices"][0].get("message", {})
                logger.info(f"🔍 Debug - Message received with keys: {list(message.keys())}")

                # Check for images in multiple locations (same logic as combine_images)
                image_url = None

                # First check: message.images (primary location)
                if message.get("images"):
                    logger.info(f"🔍 Debug - Found images in message.images")
                    image_data = message["images"][0]
                    image_url = image_data.get("image_url", {}).get("url")
                # Second check: message.content array
                elif message.get("content"):
                    content = message["content"]
                    logger.info(f"🔍 Debug - Content type: {type(content)}")

                    if isinstance(content, list):
                        logger.info(f"🔍 Debug - Content is array with {len(content)} items")
                        for i, item in enumerate(content):
                            logger.info(f"🔍 Debug - Item {i}: type={item.get('type')}")
                            if item.get("type") == "image":
                                logger.info(f"🔍 Debug - Found image in content array")
                                image_url = item.get("source", {}).get("url") or item.get("image_url", {}).get("url")
                                break
                    elif isinstance(content, str):
                        logger.warning(f"🔍 Debug - Content is text only: {content[:100]}...")
                        # Gemini returned only text, no image generated
                        raise ValueError(f"Nano Banana returned text only, no image generated: {content[:200]}...")
                    else:
                        logger.error(f"🔍 Debug - Unexpected content format: {type(content)}")
                        raise ValueError(f"Unexpected content format: {type(content)}")
                else:
                    logger.error(f"🔍 Debug - No content or images found. Message keys: {list(message.keys())}")
                    raise ValueError("No content or images found in response")

                if image_url:
                    images.append({
                        "id": f"created_{int(time.time())}_{len(images)}",
                        "url": image_url,
                        "prompt": prompt,
                        "timestamp": int(time.time() * 1000),
                        "source": "create_from_scratch"
                    })
                    logger.info(f"✅ Successfully extracted image URL: {image_url[:100]}...")
                else:
                    logger.warning("⚠️ No image URL found in response")

                # Generate multiple variations if requested and we have a valid image
                if image_url and num_images > 1:
                    logger.info(f"🔄 Creating {num_images-1} additional variations...")
                    # For now, duplicate the single generated image
                    # TODO: In future, call API multiple times for true variations
                    for i in range(1, num_images):
                        variation = {
                            "id": f"created_{int(time.time())}_{i}",
                            "url": image_url,
                            "prompt": prompt,
                            "timestamp": int(time.time() * 1000),
                            "source": "create_from_scratch"
                        }
                        images.append(variation)

            if len(images) == 0:
                # Fallback: create placeholder response
                images = [{
                    "id": f"created_{int(time.time())}_0",
                    "url": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzY2NjY2NiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkeT0iLjNlbSIgZmlsbD0iI2ZmZmZmZiIgZm9udC1zaXplPSIxOCIgZm9udC1mYW1pbHk9IkFyaWFsLEhlbHZldGljYSxzYW5zLXNlcmlmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5HZW5lcmF0ZWQgSW1hZ2U8L3RleHQ+PC9zdmc+",
                    "prompt": prompt,
                    "timestamp": int(time.time() * 1000),
                    "source": "create_from_scratch"
                }]
                logger.warning("⚠️ No images generated, using placeholder")

            return {
                "images": images,
                "total": len(images),
                "prompt": prompt,
                "style": style,
                "tool": "create_from_scratch"
            }

    except Exception as e:
        logger.error(f"💥 Exception creating images: {str(e)}")
        logger.error(f"💥 Exception type: {type(e)}")
        raise

async def call_combine_images_api_batch(image_urls: List[str], prompt: str, num_variations: int = 1, output_name: str = "combined_image", user_config: UserImageConfig = None, selected_images: List[SelectedImage] = None) -> Dict[str, Any]:
    """Combine multiple images with batch processing - generates multiple variations"""
    logger.info(f"🔄 Batch combining {len(image_urls)} images with {num_variations} variations: '{prompt[:100]}...'")

    all_images = []

    for i in range(num_variations):
        try:
            logger.info(f"🎨 Processing variation {i+1}/{num_variations}")

            # Create variation prompt with subtle differences
            variation_prompts = [
                f"{prompt}",
                f"{prompt}, artistic style",
                f"{prompt}, dynamic composition",
                f"{prompt}, enhanced lighting",
                f"{prompt}, creative blend"
            ]

            variation_prompt = variation_prompts[i % len(variation_prompts)]
            variation_name = f"{output_name}_v{i+1}"

            # Call the single combine function
            result = await call_combine_images_api_single(
                image_urls,
                variation_prompt,
                variation_name,
                user_config,
                selected_images
            )

            # Add variation number to each image
            if result.get("images"):
                for img in result["images"]:
                    img["variation"] = i + 1
                    img["id"] = f"combined_{int(time.time())}_{i+1}"

                all_images.extend(result["images"])
                logger.info(f"✅ Variation {i+1} succeeded: {len(result['images'])} images")
            else:
                logger.warning(f"⚠️ Variation {i+1}: No images in result")

            # Small delay between calls to respect rate limits
            if i < num_variations - 1:
                await asyncio.sleep(2)  # Increased delay to 2 seconds

        except Exception as e:
            logger.error(f"💥 Variation {i+1} failed: {str(e)}")
            # Continue with next variation instead of stopping
            continue

    # Ensure we have at least some results
    if len(all_images) == 0:
        raise ValueError(f"All {num_variations} variations failed to generate images")

    logger.info(f"🎉 Batch processing completed: {len(all_images)}/{num_variations} variations succeeded")

    return {
        "images": all_images,
        "total": len(all_images),
        "prompt": prompt,
        "variations": num_variations,
        "successful_variations": len(all_images),
        "tool": "nano_banana_batch"
    }

async def call_combine_images_api_single(image_urls: List[str], prompt: str, output_name: str = "combined_image", user_config: UserImageConfig = None, selected_images: List[SelectedImage] = None) -> Dict[str, Any]:
    """Combine multiple images using Gemini 2.5 Flash (Nano Banana) via OpenRouter - Single variation"""
    logger.info(f"🔄 Combining {len(image_urls)} images with Nano Banana: '{prompt[:100]}...'")

    try:
        import base64
        import io

        # Download all images first
        async with httpx.AsyncClient() as client:
            images_b64 = []
            for i, url in enumerate(image_urls, 1):
                # 🚨 URL VALIDATION: Check if URL is accessible before downloading
                try:
                    # Quick head request to validate URL
                    head_response = await client.head(url, timeout=10.0)
                    if head_response.status_code == 404:
                        logger.warning(f"⚠️ Skipping invalid URL (404): {url[:100]}...")
                        continue
                except Exception as e:
                    logger.warning(f"⚠️ Skipping unreachable URL: {url[:100]}... - {str(e)}")
                    continue

                logger.info(f"📥 Downloading image {i}/{len(image_urls)}: {url[:100]}...")
                img_response = await client.get(url, timeout=30.0)
                img_response.raise_for_status()

                # Convert to base64
                img_b64 = base64.b64encode(img_response.content).decode('utf-8')
                images_b64.append(img_b64)

            # 🚨 VALIDATION: Ensure we have at least one valid image
            if len(images_b64) == 0:
                logger.error(f"💥 No valid images found from {len(image_urls)} provided URLs")
                return {
                    "success": False,
                    "error": f"All {len(image_urls)} image URLs were invalid or unreachable",
                    "images": []
                }

            logger.info(f"✅ Successfully downloaded {len(images_b64)}/{len(image_urls)} valid images")

            # Translate Spanish to English first
            english_prompt = await translate_to_english(prompt)

            # Build enhanced prompt using user configuration
            if user_config:
                enhanced_base = ImageParameterMapper.build_enhanced_prompt(
                    english_prompt,
                    user_config,
                    selected_images
                )
                logger.info(f"🎨 Nano Banana using config: {user_config.style_preset}, temp: {user_config.temperature}")
            else:
                enhanced_base = english_prompt

            # Call OpenRouter with Gemini 2.5 Flash Image
            # Enhanced prompt to ensure image generation
            enhanced_prompt = f"CREATE AND GENERATE a new combined image by merging these {len(image_urls)} images. Instructions: {enhanced_base}. IMPORTANT: You must generate and return a visual image, not just text description."
            content = [{"type": "text", "text": enhanced_prompt}]

            # Add all images to content
            for i, img_b64 in enumerate(images_b64, 1):
                content.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}
                })

            # Build API parameters using user configuration
            api_params = ImageParameterMapper.build_nano_banana_parameters(user_config) if user_config else {"temperature": 0.3}

            combine_payload = {
                "model": "google/gemini-2.5-flash-image-preview",
                "messages": [
                    {
                        "role": "user",
                        "content": content
                    }
                ],
                "modalities": ["image", "text"],
                **api_params  # Spread user config parameters
            }

            if user_config:
                logger.info(f"🔧 Using API params: {api_params}")

            logger.info(f"🚀 Calling Nano Banana for image combination...")

            nano_response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    'Authorization': f'Bearer {OPENROUTER_API_KEY}',
                    'Content-Type': 'application/json',
                    'HTTP-Referer': FRONTEND_URL,
                    'X-Title': 'Daniel Flux Context - Nano Banana'
                },
                json=combine_payload,
                timeout=120.0
            )

            logger.info(f"📥 Nano Banana response status: {nano_response.status_code}")

            if nano_response.status_code != 200:
                logger.error(f"❌ Nano Banana failed: {nano_response.status_code}")
                logger.error(f"❌ Response: {nano_response.text}")
                nano_response.raise_for_status()

            result = nano_response.json()
            logger.info(f"✅ Nano Banana success!")

            # Extract the combined image from response
            logger.info(f"✅ Nano Banana response received, processing images...")

            if result.get("choices") and len(result["choices"]) > 0:
                message = result["choices"][0].get("message", {})
                logger.info(f"🔍 Debug - Message received with keys: {list(message.keys())}")

                # Check if there are images in the response
                combined_url = None

                if message.get("images"):
                    logger.info(f"🔍 Debug - Found images in message.images")
                    combined_image_data = message["images"][0]
                    combined_url = combined_image_data.get("image_url", {}).get("url")
                elif message.get("content"):
                    content = message["content"]
                    logger.info(f"🔍 Debug - Content type: {type(content)}")

                    if isinstance(content, list):
                        logger.info(f"🔍 Debug - Content is array with {len(content)} items")
                        for i, item in enumerate(content):
                            logger.info(f"🔍 Debug - Item {i}: type={item.get('type')}")
                            if item.get("type") == "image":
                                logger.info(f"🔍 Debug - Found image in content array")
                                combined_url = item.get("source", {}).get("url") or item.get("image_url", {}).get("url")
                                break
                    elif isinstance(content, str):
                        logger.warning(f"🔍 Debug - Content is text only: {content[:100]}...")
                        # Gemini returned only text, no image generated
                        raise ValueError(f"Nano Banana returned text only, no image generated: {content[:200]}...")
                    else:
                        logger.error(f"🔍 Debug - Unexpected content format: {type(content)}")
                        raise ValueError(f"Unexpected content format: {type(content)}")
                else:
                    logger.error(f"🔍 Debug - No content or images found. Message keys: {list(message.keys())}")
                    raise ValueError("No content or images found in response")

                if not combined_url:
                    raise ValueError("No image URL found in response")

                return {
                    "images": [{
                        "id": f"combined_{int(time.time())}",
                        "url": combined_url,
                        "prompt": f"Combined: {prompt}",
                        "timestamp": int(time.time() * 1000),
                        "output_name": output_name
                    }],
                    "total": 1,
                    "prompt": prompt,
                    "tool": "nano_banana"
                }
            else:
                raise ValueError("Invalid response format from Nano Banana")

    except Exception as e:
        logger.error(f"💥 Exception combining images: {str(e)}")
        logger.error(f"💥 Exception type: {type(e)}")
        raise

# Main multi-image function with batch support
async def call_combine_images_api_multi(image_urls: List[str], prompt: str, num_variations: int = 1, output_name: str = "combined_image", user_config: UserImageConfig = None, selected_images: List[SelectedImage] = None) -> Dict[str, Any]:
    """Multi-image combine function with batch processing support"""
    if num_variations > 1:
        return await call_combine_images_api_batch(image_urls, prompt, num_variations, output_name, user_config, selected_images)
    else:
        return await call_combine_images_api_single(image_urls, prompt, output_name, user_config, selected_images)

# Backward compatibility function - calls the new multi-image function
async def call_combine_images_api(image1_url: str, image2_url: str, prompt: str, output_name: str = "combined_image") -> Dict[str, Any]:
    """Backward compatibility wrapper for combine_images_api_multi"""
    return await call_combine_images_api_multi([image1_url, image2_url], prompt, 1, output_name)

def extract_prompt_fallback(json_str: str) -> Dict[str, Any]:
    """Extract prompt from malformed JSON with improved handling"""
    import re

    # Try to fix incomplete JSON by adding missing closing brace and brackets
    fixed_json = json_str.strip()
    logger.info(f"🔧 Fallback parsing JSON: {json_str[:200]}...")

    # Handle truncated URL arrays specifically for combine_images
    if '"image_urls":[' in fixed_json:
        # Try to close the array and object properly
        if not fixed_json.endswith(']}'):
            if not fixed_json.endswith(']'):
                fixed_json += '"]}'
            elif not fixed_json.endswith('}'):
                fixed_json += '}'
    elif not fixed_json.endswith('}'):
        fixed_json += '}'

    # Try parsing the fixed JSON first
    try:
        import json
        return json.loads(fixed_json)
    except:
        pass

    # Fallback to regex extraction
    match = re.search(r'"prompt":"([^"\\]*(\\.[^"\\]*)*)', json_str)
    if match:
        prompt = match.group(1)
        # Extract numImages if present
        num_match = re.search(r'"numImages":(\d+)', json_str)
        num_images = int(num_match.group(1)) if num_match else 3
        return {"prompt": prompt, "numImages": num_images}

    raise ValueError("Could not extract prompt from malformed JSON")

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """Chat endpoint with AI agent and tool calling"""
    try:
        logger.info(f"💬 Chat request received: message='{request.message[:100]}...'")
        logger.info(f"📝 Context: {len(request.messages)} history messages, {len(request.selectedImages) if request.selectedImages else 0} selected images")
        logger.info(f"⚙️ User config provided: {request.userConfig is not None}")

        # Build system prompt with selected images context
        system_content = SYSTEM_PROMPT

        # Add user configuration context if provided
        if request.userConfig:
            config_context = f"\n\nUSER IMAGE CONFIGURATION:\n"
            config_context += f"- Creativity (temperature): {request.userConfig.temperature}\n"

            # Advanced parameters (only show if not default)
            if request.userConfig.style_preset and request.userConfig.style_preset != 'photorealistic':
                config_context += f"- Style: {request.userConfig.style_preset}\n"
            if request.userConfig.lighting_preference and request.userConfig.lighting_preference != 'studio':
                config_context += f"- Lighting: {request.userConfig.lighting_preference}\n"
            if request.userConfig.mood and request.userConfig.mood != 'professional':
                config_context += f"- Mood: {request.userConfig.mood}\n"
            if request.userConfig.seed:
                config_context += f"- Seed (reproducibility): {request.userConfig.seed}\n"

            config_context += "\nIMPORTANT: Use these preferences when calling image generation tools."
            system_content += config_context

        if request.selectedImages:
            images_context = f"\n\nSELECTED IMAGES CONTEXT ({len(request.selectedImages)} images):\n"
            image_urls = []
            for i, img in enumerate(request.selectedImages, 1):
                images_context += f"Image {i}: {img.url} (ID: {img.id}, Source: {img.source})\n"
                image_urls.append(img.url)
            images_context += f"\nImage URLs Array: {image_urls}\n"
            images_context += "\nWhen user asks to combine images, use ALL these URLs in the image_urls array parameter for combine_images tool."
            system_content += images_context

        # Prepare messages with multimodal support
        messages = [{"role": "system", "content": system_content}]

        # 🚨 AGGRESSIVE CONTEXT TRUNCATION: Only keep last 2 messages to prevent 762k tokens overflow
        # This is the 20% fix that solves 80% of context issues
        recent_messages = request.messages[-2:] if len(request.messages) > 2 else request.messages
        for msg in recent_messages:
            messages.append({"role": msg.role, "content": msg.content})

        # Prepare user message with vision capabilities
        user_message_content = []
        user_message_content.append({"type": "text", "text": request.message})

        # Add selected images for GPT-5 vision analysis if available
        if request.selectedImages:
            logger.info(f"👁️ Adding {len(request.selectedImages)} images for GPT-5 vision analysis")
            for i, img in enumerate(request.selectedImages):
                # 🚨 CRITICAL FIX: Replace base64 images with text placeholders to prevent context overflow
                if img.url.startswith('data:'):
                    # For base64 images, add placeholder description instead of full image
                    user_message_content.append({
                        "type": "text",
                        "text": f"[Base64 Combined Image] (Source: {img.source}) - Using text placeholder to prevent context overflow"
                    })
                    logger.info(f"🖼️ Image {i+1}: [Base64 Combined Image] (Source: {img.source}) - Using text placeholder to prevent context overflow")
                else:
                    # Regular URLs are fine
                    user_message_content.append({
                        "type": "image_url",
                        "image_url": {"url": img.url}
                    })
                    logger.info(f"🖼️ Image {i+1}: {img.url[:100]}... (Source: {img.source})")

        # Add the multimodal user message
        messages.append({
            "role": "user",
            "content": user_message_content if len(user_message_content) > 1 else request.message
        })

        # Call OpenRouter
        data = await call_openrouter(messages)
        choice = data.get("choices", [{}])[0]
        response_msg = choice.get("message", {})

        # Debug: Log the full response structure
        logger.info(f"🔍 OpenRouter response structure: {list(data.keys())}")
        logger.info(f"🔍 Message keys: {list(response_msg.keys())}")
        if "reasoning" in response_msg:
            logger.info(f"🔍 Reasoning type: {type(response_msg['reasoning'])}")
            logger.info(f"🔍 Reasoning sample: {str(response_msg['reasoning'])[:200]}...")

        # Extract reasoning details if available
        raw_reasoning = response_msg.get("reasoning", [])
        reasoning_details = []

        # Handle different reasoning formats from OpenRouter
        if raw_reasoning:
            if isinstance(raw_reasoning, list):
                reasoning_details = raw_reasoning
            elif isinstance(raw_reasoning, str):
                # Convert string reasoning to structured format
                reasoning_details = [{
                    "type": "raw_text",
                    "content": raw_reasoning
                }]
            else:
                logger.warning(f"⚠️ Unexpected reasoning format: {type(raw_reasoning)}")
                reasoning_details = []

        # Check for tool calls
        if response_msg.get("tool_calls"):
            tool_call = response_msg["tool_calls"][0]
            tool_name = tool_call["function"]["name"]
            logger.info(f"🎯 Agent selected tool: {tool_name}")

            if tool_name == "generate_avatar":
                try:
                    # Parse tool arguments
                    raw_args = tool_call["function"]["arguments"]
                    logger.info(f"🔍 Raw tool arguments: {raw_args}")

                    try:
                        args = json.loads(raw_args)
                        logger.info(f"✅ Successfully parsed JSON args: {args}")
                    except json.JSONDecodeError as e:
                        logger.warning(f"⚠️ JSON parsing failed: {e}")
                        logger.info(f"🔧 Attempting fallback extraction...")
                        args = extract_prompt_fallback(raw_args)
                        logger.info(f"✅ Fallback extraction successful: {args}")

                    # Generate images with user configuration
                    result = await call_generate_api(
                        args["prompt"],
                        args.get("numImages", 3),
                        request.userConfig,
                        request.selectedImages
                    )

                    return ChatResponse(
                        response=f"✨ Generated {result['total']} images with DANI prompt '{args['prompt'][:100]}...' Check the gallery! 🎨",
                        tool_used="generate_avatar",
                        tool_result=result,
                        usage=data.get("usage"),
                        model=data.get("model"),
                        reasoning_details=reasoning_details
                    )
                except Exception as e:
                    return ChatResponse(response=f"❌ Error generating images: {str(e)}", reasoning_details=reasoning_details)

            elif tool_name == "create_images":
                try:
                    # Parse tool arguments
                    raw_args = tool_call["function"]["arguments"]
                    logger.info(f"🔍 Raw create tool arguments: {raw_args}")

                    try:
                        args = json.loads(raw_args)
                        logger.info(f"✅ Successfully parsed create args: {args}")
                    except json.JSONDecodeError as e:
                        logger.warning(f"⚠️ Create JSON parsing failed: {e}")
                        logger.info(f"🔧 Attempting fallback extraction...")
                        args = extract_prompt_fallback(raw_args)
                        logger.info(f"✅ Create fallback extraction successful: {args}")

                    # Create images from scratch
                    result = await call_create_images_api(
                        args["prompt"],
                        args.get("style", "photorealistic"),
                        args.get("numImages", 2),
                        request.userConfig
                    )

                    return ChatResponse(
                        response=f"🎨 Created {result['total']} images from scratch! '{args['prompt'][:100]}...' Check the Generated tab! ✨",
                        tool_used="create_images",
                        tool_result=result,
                        usage=data.get("usage"),
                        model=data.get("model"),
                        reasoning_details=reasoning_details
                    )
                except Exception as e:
                    return ChatResponse(response=f"❌ Error creating images: {str(e)}", reasoning_details=reasoning_details)

            elif tool_name == "combine_images":
                try:
                    # Parse tool arguments
                    raw_args = tool_call["function"]["arguments"]
                    logger.info(f"🔍 Raw combine tool arguments: {raw_args}")

                    try:
                        args = json.loads(raw_args)
                        logger.info(f"✅ Successfully parsed combine args: {args}")
                    except json.JSONDecodeError as e:
                        logger.warning(f"⚠️ Combine JSON parsing failed: {e}")
                        logger.info(f"🔧 Attempting fallback extraction...")
                        args = extract_prompt_fallback(raw_args)
                        logger.info(f"✅ Combine fallback extraction successful: {args}")

                    # Combine images using Nano Banana with user configuration
                    # Check if using new multi-image format or old format
                    if "image_urls" in args:
                        num_variations = args.get("num_variations", 1)
                        logger.info(f"🔄 Using multi-image format with {len(args['image_urls'])} images, {num_variations} variations")
                        result = await call_combine_images_api_multi(
                            args["image_urls"],
                            args["prompt"],
                            num_variations,
                            args.get("output_name", "combined_image"),
                            request.userConfig,
                            request.selectedImages
                        )
                    else:
                        logger.info(f"🔄 Using legacy 2-image format")
                        result = await call_combine_images_api(
                            args["image1_url"],
                            args["image2_url"],
                            args["prompt"],
                            args.get("output_name", "combined_image")
                        )

                    # Create response based on variations
                    variations_text = ""
                    if num_variations > 1:
                        variations_text = f" ({num_variations} variations)"

                    return ChatResponse(
                        response=f"🔄 Combined {len(args['image_urls'])} images successfully{variations_text}! '{args['prompt'][:100]}...' Check the gallery! ✨",
                        tool_used="combine_images",
                        tool_result=result,
                        usage=data.get("usage"),
                        model=data.get("model"),
                        reasoning_details=reasoning_details
                    )
                except Exception as e:
                    return ChatResponse(response=f"❌ Error combining images: {str(e)}", reasoning_details=reasoning_details)

        # No tool call - return text response
        return ChatResponse(
            response=response_msg.get("content", "I apologize, but I could not generate a response."),
            usage=data.get("usage"),
            model=data.get("model"),
            reasoning_details=reasoning_details
        )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"💥 Unexpected chat error: {e}")
        logger.error(f"💥 Error type: {type(e)}")
        logger.error(f"💥 Request details: message='{request.message[:50]}...', selectedImages={len(request.selectedImages) if request.selectedImages else 0}")
        raise HTTPException(status_code=500, detail=f"Chat processing error: {str(e)}")

@router.get("/chat/health")
async def health():
    """Health check"""
    return {"status": "healthy", "backend": "fastapi"}