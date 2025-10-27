#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# 🚀 Backend Smart Server Launcher
# Reads PORT from .env and starts uvicorn
# ═══════════════════════════════════════════════════════════════

set -e  # Exit on any error

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ═══════════════════════════════════════════════════════════════
# 1. READ PORT FROM .env
# ═══════════════════════════════════════════════════════════════

if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Please create backend/.env with BACKEND_PORT defined"
    exit 1
fi

# Extract BACKEND_PORT from .env (handles quoted and unquoted values)
BACKEND_PORT=$(grep -E "^BACKEND_PORT=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
FRONTEND_URL=$(grep -E "^FRONTEND_URL=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")

if [ -z "$BACKEND_PORT" ]; then
    echo -e "${YELLOW}⚠️  BACKEND_PORT not found in .env${NC}"
    echo "Using default port 8000"
    BACKEND_PORT=8000
fi

if [ -z "$FRONTEND_URL" ]; then
    echo -e "${YELLOW}⚠️  FRONTEND_URL not found in .env${NC}"
    echo "Using default http://localhost:3000"
    FRONTEND_URL="http://localhost:3000"
fi

# ═══════════════════════════════════════════════════════════════
# 2. CHECK IF PORT IS AVAILABLE
# ═══════════════════════════════════════════════════════════════

if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}❌ Port $BACKEND_PORT is already in use${NC}"
    echo ""
    echo "Currently using:"
    lsof -i :$BACKEND_PORT 2>/dev/null || echo "  (could not determine process)"
    echo ""
    echo "Solution: Kill the process or change BACKEND_PORT in backend/.env"
    exit 1
fi

# ═══════════════════════════════════════════════════════════════
# 3. START UVICORN
# ═══════════════════════════════════════════════════════════════

echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}🚀 Starting FastAPI Dev Server${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "📍 Backend:  ${GREEN}http://localhost:${BACKEND_PORT}${NC}"
echo -e "📍 Frontend: ${GREEN}${FRONTEND_URL}${NC}"
echo ""
echo -e "${YELLOW}💡 Tip: Edit BACKEND_PORT in .env to change port${NC}"
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Export variables for uvicorn process
export BACKEND_PORT=$BACKEND_PORT
export FRONTEND_URL=$FRONTEND_URL

# Run uvicorn with the port from .env
uvicorn main:app \
    --host 0.0.0.0 \
    --port $BACKEND_PORT \
    --reload \
    --log-level info

