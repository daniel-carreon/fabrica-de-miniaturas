"""
Chat Agent Router - AI Agent with Tool Calling in FastAPI
Migrated from Next.js for better AI scalability
"""
import json
import logging
import time
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
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

class ChatRequest(BaseModel):
    message: str
    messages: List[ChatMessage] = []
    selectedImages: List[SelectedImage] = []

class ChatResponse(BaseModel):
    response: str
    tool_used: Optional[str] = None
    tool_result: Optional[Dict[str, Any]] = None
    usage: Optional[Dict[str, Any]] = None
    model: Optional[str] = None

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
        "description": "Combine two existing images from the gallery using Nano Banana (Gemini 2.5 Flash)",
        "parameters": {
            "type": "object",
            "properties": {
                "image1_url": {"type": "string", "description": "URL of the first image to combine"},
                "image2_url": {"type": "string", "description": "URL of the second image to combine"},
                "prompt": {"type": "string", "description": "Instructions for how to combine the images"},
                "output_name": {"type": "string", "description": "Name for the resulting combined image", "default": "combined_image"}
            },
            "required": ["image1_url", "image2_url", "prompt"]
        }
    }
}]

# System prompt - deterministic
SYSTEM_PROMPT = """You are a deterministic multi-tool image assistant. You have TWO tools available:

1. generate_images: Generate new images using DANI fine-tuned model
2. combine_images: Combine two existing images using Nano Banana

MANDATORY BEHAVIOR - ALWAYS CALL THE APPROPRIATE TOOL:

🎨 GENERATION KEYWORDS → generate_images tool:
- "genera", "generame", "crea", "haz", "hace"
- "imagen", "imagenes", "foto", "fotos"
- "DANI" (trigger obligatorio)

🔄 COMBINATION KEYWORDS → combine_images tool:
- "combina", "mezcla", "fusiona", "une"
- "dos imagenes", "2 imagenes", "primera y segunda"
- "thumbnail", "miniatura final"

NUMBER OF IMAGES RULES (for generate_images):
- "una imagen" or "1 imagen" → numImages: 1
- "dos imagenes" or "2 imagenes" → numImages: 2
- "tres imagenes" or "3 imagenes" → numImages: 3
- "imagenes" (plural) without number → numImages: 3
- If not specified → numImages: 3

COMBINATION RULES (for combine_images):
- User must provide 2 image URLs or reference images from gallery
- Always ask for combination prompt (how to merge them)
- Use descriptive output_name

EXAMPLES:
"genera 3 imagenes de DANI tech reviewer" → CALL generate_images
"combina la primera y segunda imagen para hacer thumbnail" → CALL combine_images

Temperature=0. Be 100% consistent."""

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
                "model": "gpt-5-mini",
                "messages": messages,
                "tools": TOOLS,
                "tool_choice": "auto",
                "max_tokens": 1500,
                "temperature": 0.1,
                "top_p": 0.5
            },
            timeout=60.0
        )
        response.raise_for_status()
        return response.json()

async def call_generate_api(prompt: str, num_images: int = 3) -> Dict[str, Any]:
    """Call frontend generate API"""
    logger.info(f"🚀 Calling Replicate with prompt: '{prompt[:100]}...' and {num_images} images")

    try:
        async with httpx.AsyncClient() as client:
            url = f"{FRONTEND_URL}/api/generate"
            payload = {"prompt": prompt, "numImages": num_images}

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

async def call_combine_images_api(image1_url: str, image2_url: str, prompt: str, output_name: str = "combined_image") -> Dict[str, Any]:
    """Combine two images using Gemini 2.5 Flash (Nano Banana) via OpenRouter"""
    logger.info(f"🔄 Combining images with Nano Banana: '{prompt[:100]}...'")

    try:
        import base64
        import io

        # Download both images first
        async with httpx.AsyncClient() as client:
            logger.info(f"📥 Downloading image 1: {image1_url[:100]}...")
            img1_response = await client.get(image1_url, timeout=30.0)
            img1_response.raise_for_status()

            logger.info(f"📥 Downloading image 2: {image2_url[:100]}...")
            img2_response = await client.get(image2_url, timeout=30.0)
            img2_response.raise_for_status()

            # Convert to base64
            img1_b64 = base64.b64encode(img1_response.content).decode('utf-8')
            img2_b64 = base64.b64encode(img2_response.content).decode('utf-8')

            # Call OpenRouter with Gemini 2.5 Flash Image
            combine_payload = {
                "model": "google/gemini-2.5-flash-image-preview",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": f"Combine these two images as follows: {prompt}"},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img1_b64}"}},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img2_b64}"}}
                        ]
                    }
                ],
                "modalities": ["image", "text"],
                "max_tokens": 1500
            }

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
            if result.get("choices") and len(result["choices"]) > 0:
                message = result["choices"][0].get("message", {})

                # Check if there are images in the response
                if message.get("images"):
                    combined_image_data = message["images"][0]
                    combined_url = combined_image_data.get("image_url", {}).get("url")

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
                    raise ValueError("No combined image returned from Nano Banana")
            else:
                raise ValueError("Invalid response format from Nano Banana")

    except Exception as e:
        logger.error(f"💥 Exception combining images: {str(e)}")
        logger.error(f"💥 Exception type: {type(e)}")
        raise

def extract_prompt_fallback(json_str: str) -> Dict[str, Any]:
    """Extract prompt from malformed JSON with improved handling"""
    import re

    # Try to fix incomplete JSON by adding missing closing brace
    fixed_json = json_str.strip()
    if not fixed_json.endswith('}'):
        fixed_json += '"}'

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

        if request.selectedImages:
            images_context = "\n\nSELECTED IMAGES CONTEXT:\n"
            for i, img in enumerate(request.selectedImages, 1):
                images_context += f"Image {i}: {img.url} (ID: {img.id}, Source: {img.source})\n"
            images_context += "\nWhen user asks to combine images, use these URLs as image1_url and image2_url parameters."
            system_content += images_context

        # Prepare messages
        messages = [{"role": "system", "content": system_content}]
        for msg in request.messages[-10:]:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": request.message})

        # Call OpenRouter
        data = await call_openrouter(messages)
        choice = data.get("choices", [{}])[0]
        response_msg = choice.get("message", {})

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

                    # Generate images
                    result = await call_generate_api(args["prompt"], args.get("numImages", 3))

                    return ChatResponse(
                        response=f"✨ Generated {result['total']} images with prompt '{args['prompt'][:100]}...' Check the gallery! 🎨",
                        tool_used="generate_images",
                        tool_result=result,
                        usage=data.get("usage"),
                        model=data.get("model")
                    )
                except Exception as e:
                    return ChatResponse(response=f"❌ Error generating images: {str(e)}")

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

                    # Combine images using Nano Banana
                    result = await call_combine_images_api(
                        args["image1_url"],
                        args["image2_url"],
                        args["prompt"],
                        args.get("output_name", "combined_image")
                    )

                    return ChatResponse(
                        response=f"🔄 Combined images successfully! '{args['prompt'][:100]}...' Check the gallery! ✨",
                        tool_used="combine_images",
                        tool_result=result,
                        usage=data.get("usage"),
                        model=data.get("model")
                    )
                except Exception as e:
                    return ChatResponse(response=f"❌ Error combining images: {str(e)}")

        # No tool call - return text response
        return ChatResponse(
            response=response_msg.get("content", "I apologize, but I could not generate a response."),
            usage=data.get("usage"),
            model=data.get("model")
        )

    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/chat/health")
async def health():
    """Health check"""
    return {"status": "healthy", "backend": "fastapi"}