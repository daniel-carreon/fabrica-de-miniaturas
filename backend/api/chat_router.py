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
    """User configuration for image generation and combination"""

    # Character Consistency Settings
    character_consistency: Literal['strict', 'flexible', 'creative'] = Field(
        default='flexible',
        description="Level of character identity preservation"
    )
    dani_description: Optional[str] = Field(
        default=None,
        description="Custom description for DANI character consistency"
    )
    preserve_facial_features: bool = Field(
        default=True,
        description="Whether to explicitly preserve facial features"
    )

    # Visual Style Settings
    style_preset: Literal['photorealistic', 'artistic', 'cinematic', 'portrait'] = Field(
        default='photorealistic',
        description="Overall visual style approach"
    )
    lighting_preference: Literal['studio', 'natural', 'dramatic', 'soft'] = Field(
        default='studio',
        description="Lighting style preference"
    )
    mood: Literal['professional', 'casual', 'dynamic', 'authoritative', 'friendly'] = Field(
        default='professional',
        description="Overall mood and tone"
    )

    # Technical Parameters
    temperature: float = Field(
        default=0.3,
        ge=0.1,
        le=1.0,
        description="Creativity level (0.1=conservative, 1.0=creative)"
    )
    seed: Optional[int] = Field(
        default=None,
        description="Seed for reproducible results"
    )

    # Generation Preferences
    image_quality: Literal['standard', 'high', 'ultra'] = Field(
        default='high',
        description="Output image quality level"
    )
    aspect_ratio: Literal['square', 'landscape', 'portrait', 'widescreen'] = Field(
        default='landscape',
        description="Preferred aspect ratio for generated images"
    )

    @validator('temperature')
    def validate_temperature(cls, v):
        if not 0.1 <= v <= 1.0:
            raise ValueError('Temperature must be between 0.1 and 1.0')
        return v

    @validator('dani_description')
    def validate_dani_description(cls, v):
        if v and len(v) > 500:
            raise ValueError('DANI description must be under 500 characters')
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

# OpenRouter config
OPENROUTER_API_KEY = "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"
FRONTEND_URL = "http://localhost:3000"

# Tool definition
TOOLS = [
{
    "type": "function",
    "function": {
        "name": "generate_images",
        "description": "Generate personalized images using the DANI fine-tuned model",
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

# System prompt - deterministic with concise prompt optimization
SYSTEM_PROMPT = """You are a deterministic multi-tool image assistant with ADVANCED VISION CAPABILITIES. You have THREE core capabilities:

👁️ VISION ANALYSIS: You can SEE and analyze any images the user has selected
- Describe content, composition, lighting, style, quality, and facial features
- Provide intelligent suggestions based on visual analysis
- Make informed decisions about combinations using what you observe
- Analyze technical aspects like resolution, format, and artistic quality

🎨 generate_images: Generate new images using DANI fine-tuned model
2. combine_images: Combine two existing images using Nano Banana

MANDATORY BEHAVIOR - ALWAYS CALL THE APPROPRIATE TOOL:

🎨 GENERATION KEYWORDS → generate_images tool:
- "genera", "generame", "crea", "haz", "hace"
- "imagen", "imagenes", "foto", "fotos"
- "DANI" (trigger obligatorio)

🔄 COMBINATION KEYWORDS → combine_images tool:
- "combina", "mezcla", "fusiona", "une"
- "con estas imágenes", "usando estas", "estas X imágenes"
- "genera usando estas imágenes" (IMPORTANT: this should use combine_images, NOT generate_images!)
- "thumbnail", "miniatura final"
- When user has selectedImages AND uses combination words

👁️ VISION ANALYSIS KEYWORDS → Provide visual analysis without tool calling:
- "analiza", "describe", "que ves", "como se ve"
- "calidad", "composición", "lighting", "style"
- "qué opinas", "sugerencias", "recomendaciones"

NUMBER OF IMAGES RULES (for generate_images):
- "una imagen" or "1 imagen" → numImages: 1
- "dos imagenes" or "2 imagenes" → numImages: 2
- "tres imagenes" or "3 imagenes" → numImages: 3
- "imagenes" (plural) without number → numImages: 3
- If not specified → numImages: 3

COMBINATION RULES (for combine_images):
- User must have 2-8 selectedImages in context
- Use ALL URLs from selectedImages array as image_urls parameter
- Leverage your vision analysis to create better combination prompts
- Use descriptive output_name based on what you see
- BATCH VARIATIONS:
  - "genera 5 variaciones" → num_variations: 5
  - "varias versiones" → num_variations: 3
  - "diferentes opciones" → num_variations: 3
  - If not specified → num_variations: 1

IMPORTANT: Keep prompts CONCISE (under 200 chars) to avoid GPU memory issues. Focus on key elements only.

EXAMPLES:
"genera 3 imagenes de DANI tech reviewer" → CALL generate_images with prompt: "DANI tech reviewer setup"
"combina la primera y segunda imagen para hacer thumbnail" → CALL combine_images
"analiza estas imágenes" → Provide detailed visual analysis without tools

Temperature=0. Be 100% consistent."""

class ImageParameterMapper:
    """Converts user configuration to model-specific parameters"""

    @staticmethod
    def build_character_consistency_prompt(config: UserImageConfig, base_description: str = None) -> str:
        """Build character consistency instructions based on user config"""
        if not config:
            return base_description or ""

        # Get DANI description (custom or default)
        dani_desc = config.dani_description or "elegant healthy man, robust build, authoritative gaze, AI leader"

        # Build consistency instructions based on level
        if config.character_consistency == 'strict':
            consistency_instruction = f"PRESERVE CHARACTER IDENTITY: Maintain exactly these features: {dani_desc}. Keep facial structure, expression, and physical characteristics identical."
        elif config.character_consistency == 'flexible':
            consistency_instruction = f"MAINTAIN CHARACTER CORE: Keep the essence of this character: {dani_desc}. Allow minor variations while preserving key identity features."
        else:  # creative
            consistency_instruction = f"CREATIVE INTERPRETATION: Use this character as inspiration: {dani_desc}. Allow artistic interpretation while maintaining recognizable elements."

        return consistency_instruction

    @staticmethod
    def build_style_instructions(config: UserImageConfig) -> str:
        """Build style and mood instructions"""
        if not config:
            return "photorealistic style with professional lighting"

        style_map = {
            'photorealistic': "highly detailed photorealistic style, sharp focus, professional photography",
            'artistic': "artistic interpretation, stylized rendering, creative visual approach",
            'cinematic': "cinematic composition, dramatic lighting, movie-like quality",
            'portrait': "portrait photography style, focused on facial features and expression"
        }

        lighting_map = {
            'studio': "professional studio lighting, even illumination, soft shadows",
            'natural': "natural lighting, realistic environmental illumination",
            'dramatic': "dramatic lighting with strong contrasts, dynamic shadows",
            'soft': "soft diffused lighting, gentle shadows, warm ambiance"
        }

        mood_map = {
            'professional': "professional demeanor, confident and authoritative presence",
            'casual': "relaxed and approachable, casual atmosphere",
            'dynamic': "energetic and dynamic, action-oriented composition",
            'authoritative': "commanding presence, leadership qualities emphasized",
            'friendly': "warm and approachable, friendly expression"
        }

        instructions = [
            style_map.get(config.style_preset, style_map['photorealistic']),
            lighting_map.get(config.lighting_preference, lighting_map['studio']),
            mood_map.get(config.mood, mood_map['professional'])
        ]

        return ", ".join(instructions)

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
        """Build enhanced prompt combining base prompt with user configuration"""
        if not config:
            return base_prompt

        # Start with base prompt
        enhanced_parts = [base_prompt]

        # Add character consistency if relevant (check for DANI or if images selected)
        if "DANI" in base_prompt.upper() or (selected_images and any("dani" in img.source.lower() for img in selected_images)):
            character_instruction = ImageParameterMapper.build_character_consistency_prompt(config)
            enhanced_parts.append(character_instruction)

        # Add style instructions
        style_instruction = ImageParameterMapper.build_style_instructions(config)
        enhanced_parts.append(style_instruction)

        # Add facial feature preservation if enabled
        if config.preserve_facial_features:
            enhanced_parts.append("Preserve facial features and expressions accurately")

        # Join with proper punctuation
        enhanced_prompt = ". ".join(enhanced_parts)

        # Ensure proper ending
        if not enhanced_prompt.endswith('.'):
            enhanced_prompt += '.'

        return enhanced_prompt

async def translate_to_english(text: str) -> str:
    """Translate Spanish text to English using GPT-5-mini"""
    # Simple detection - if contains Spanish words, translate
    spanish_indicators = ['imagen', 'imagenes', 'genera', 'generame', 'combina', 'mezcla', 'fusiona', 'miniatura', 'fondo', 'texto', 'estilo', 'con', 'para', 'que', 'una', 'unas', 'estas', 'este']

    if any(word in text.lower() for word in spanish_indicators):
        logger.info(f"🌍 Detected Spanish, translating: '{text[:50]}...'")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    'Authorization': f'Bearer {OPENROUTER_API_KEY}',
                    'Content-Type': 'application/json',
                    'HTTP-Referer': FRONTEND_URL,
                    'X-Title': 'Daniel Flux Context - Translator'
                },
                json={
                    "model": "openai/gpt-5",
                    "messages": [
                        {"role": "system", "content": "Translate the following Spanish text to English. Keep technical terms, names, and specific instructions intact. Only return the translation, no explanations."},
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
            logger.info(f"✅ Translated to: '{translated[:50]}...'")
            return translated.strip()

    return text

async def call_openrouter(messages: List[Dict[str, str]]) -> Dict[str, Any]:
    """Call OpenRouter API"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                'Authorization': f'Bearer {OPENROUTER_API_KEY}',
                'Content-Type': 'application/json',
                'HTTP-Referer': FRONTEND_URL,
                'X-Title': 'Daniel Flux Context'
            },
            json={
                "model": "openai/gpt-5",
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
            },
            timeout=60.0
        )
        response.raise_for_status()
        return response.json()

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
        logger.info(f"🎨 Using user config: {user_config.style_preset}, consistency: {user_config.character_consistency}")
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
                logger.info(f"📥 Downloading image {i}/{len(image_urls)}: {url[:100]}...")
                img_response = await client.get(url, timeout=30.0)
                img_response.raise_for_status()

                # Convert to base64
                img_b64 = base64.b64encode(img_response.content).decode('utf-8')
                images_b64.append(img_b64)

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
        # Build system prompt with selected images context
        system_content = SYSTEM_PROMPT

        # Add user configuration context if provided
        if request.userConfig:
            config_context = f"\n\nUSER IMAGE CONFIGURATION:\n"
            config_context += f"- Character Consistency: {request.userConfig.character_consistency}\n"
            config_context += f"- Style Preset: {request.userConfig.style_preset}\n"
            config_context += f"- Lighting Preference: {request.userConfig.lighting_preference}\n"
            config_context += f"- Mood: {request.userConfig.mood}\n"
            config_context += f"- Temperature: {request.userConfig.temperature}\n"
            config_context += f"- Preserve Facial Features: {request.userConfig.preserve_facial_features}\n"

            if request.userConfig.dani_description:
                config_context += f"- Custom DANI Description: {request.userConfig.dani_description}\n"

            config_context += "\nIMPORTANT: Use these preferences when calling image generation tools. "
            config_context += "Apply the specified character consistency level, style, and mood to enhance prompts appropriately."
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

        # Add conversation history (text only)
        for msg in request.messages[-10:]:
            messages.append({"role": msg.role, "content": msg.content})

        # Prepare user message with vision capabilities
        user_message_content = []
        user_message_content.append({"type": "text", "text": request.message})

        # Add selected images for GPT-5 vision analysis if available
        if request.selectedImages:
            logger.info(f"👁️ Adding {len(request.selectedImages)} images for GPT-5 vision analysis")
            for i, img in enumerate(request.selectedImages):
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
            if tool_call["function"]["name"] == "generate_images":
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
                        tool_used="generate_images",
                        tool_result=result,
                        usage=data.get("usage"),
                        model=data.get("model"),
                        reasoning_details=reasoning_details
                    )
                except Exception as e:
                    return ChatResponse(response=f"❌ Error generating images: {str(e)}", reasoning_details=reasoning_details)

            elif tool_call["function"]["name"] == "combine_images":
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

    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chat/health")
async def health():
    """Health check"""
    return {"status": "healthy", "backend": "fastapi"}