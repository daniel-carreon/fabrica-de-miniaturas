"""
FastAPI Backend - Daniel Flux Context
Main application with chat agent integration
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.chat_router import router as chat_router
import logging

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
app.include_router(chat_router, prefix="/api")

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
    uvicorn.run(app, host="0.0.0.0", port=8000)