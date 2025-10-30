"""
FastAPI Backend - Daniel Flux Context
Main application with chat agent integration
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.chat_router import router as chat_router
from api.chat_streaming_router import router as chat_streaming_router
from api.conversation_router import router as conversation_router
# from api.chat_v2_router import router as chat_v2_router  # Disabled: Pydantic AI syntax issue
# from api.chat_pydantic_router import router as chat_pydantic_router  # TODO: Enable when Pydantic AI 1.9.0 compatible
import logging
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Daniel Flux Context Backend",
    description="AI-powered image generation backend with chat agent",
    version="1.0.0"
)

# Configure CORS for frontend - Support multiple fallback ports
ALLOWED_ORIGINS = [
    # Railway Production
    "https://fabrica-de-miniaturas.up.railway.app",
    "https://fabrica-de-miniaturas-production.up.railway.app",
    # Vercel (legacy)
    "https://daniel-flux-context.vercel.app",
    "https://fabrica-de-miniaturas.vercel.app",
    # Local development - auto port detection 3000-3006
    *[f"http://localhost:{port}" for port in range(3000, 3007)],
    *[f"http://127.0.0.1:{port}" for port in range(3000, 3007)],
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
# PRIMARY: Improved chat router with Claude 4.5 Sonnet + markdown support
app.include_router(chat_router, prefix="/api")  # Main chat endpoint with Claude 4.5

# NEW: Streaming chat router with SSE (Server-Sent Events)
app.include_router(chat_streaming_router, prefix="/api", tags=["chat-streaming"])  # Streaming endpoint /api/chat/stream

# SECONDARY: Conversation management
app.include_router(conversation_router, prefix="/api")  # Conversation CRUD endpoints

# DISABLED: See imports above for reasons
# app.include_router(chat_v2_router, prefix="/api")  # Pydantic AI syntax issues
# app.include_router(chat_pydantic_router, prefix="/api")  # TODO: Fix Pydantic AI 1.9.0 compatibility

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Daniel Flux Context Backend API", "status": "running"}

@app.get("/health")
async def health():
    """Health check"""
    return {"status": "healthy", "backend": "fastapi", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    # Get port from environment variable (default: 8000)
    backend_port = int(os.getenv("BACKEND_PORT", "8000"))
    logger.info(f"🚀 Starting backend on port {backend_port}")
    uvicorn.run(app, host="0.0.0.0", port=backend_port)