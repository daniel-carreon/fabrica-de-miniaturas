"""
Chat Agent Router - AI Agent with Tool Calling in FastAPI
Migrated from Next.js for better AI scalability
"""
import json
import logging
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

class ChatRequest(BaseModel):
    message: str
    messages: List[ChatMessage] = []

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
TOOLS = [{
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
}]

# System prompt - deterministic
SYSTEM_PROMPT = """You are a deterministic image generation assistant. Your ONLY job is to call the generate_images tool when users request visuals.

MANDATORY BEHAVIOR:
- When you see ANY visual keywords (generate, crear, make, imagen, image, thumbnail, photo, visual, DANI), you MUST call generate_images tool
- NO conversation, NO questions - JUST call the tool immediately

NUMBER OF IMAGES RULES:
- If user says "una imagen" or "1 imagen" → numImages: 1
- If user says "dos imagenes" or "2 imagenes" → numImages: 2
- If user says "tres imagenes" or "3 imagenes" → numImages: 3
- If user says "imagenes" (plural) without number → numImages: 3
- If user doesn't specify → numImages: 3

SPANISH KEYWORDS TRIGGER:
- "genera", "generame", "crea", "haz", "hace"
- "imagen", "imagenes", "foto", "fotos"
- "DANI" (trigger obligatorio)

RULE: IF (visual keywords detected) THEN call_generate_images_tool()

EXAMPLES:
"genera una imagen de DANI" → CALL generate_images with numImages: 1
"generame imagenes de DANI" → CALL generate_images with numImages: 3
"haz 2 fotos de DANI" → CALL generate_images with numImages: 2

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
        # Prepare messages
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
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