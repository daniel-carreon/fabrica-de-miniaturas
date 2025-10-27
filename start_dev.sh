#!/bin/bash

# 🚀 Smart Development Server Starter
# Automatically starts frontend and backend with proper port configuration
# Usage: ./start_dev.sh [frontend_port] [backend_port]

set -e

# Default ports
FRONTEND_PORT=${1:-3001}
BACKEND_PORT=${2:-8001}

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Fábrica de Miniaturas Development Environment${NC}"
echo -e "${YELLOW}Frontend Port: $FRONTEND_PORT${NC}"
echo -e "${YELLOW}Backend Port: $BACKEND_PORT${NC}"
echo ""

# Validate ports
if ! [[ "$FRONTEND_PORT" =~ ^[0-9]+$ ]] || ! [[ "$BACKEND_PORT" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}❌ Error: Ports must be numbers${NC}"
    echo "Usage: ./start_dev.sh [frontend_port] [backend_port]"
    echo "Example: ./start_dev.sh 3001 8001"
    exit 1
fi

# Check if ports are already in use
echo -e "${BLUE}Checking ports...${NC}"

if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port $FRONTEND_PORT is already in use${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Exiting...${NC}"
        exit 1
    fi
fi

if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port $BACKEND_PORT is already in use${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Exiting...${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Ports available${NC}"
echo ""

# Update environment files
echo -e "${BLUE}Updating configuration files...${NC}"

# Update frontend .env.local
sed -i '' "s|NEXT_PUBLIC_BACKEND_URL=.*|NEXT_PUBLIC_BACKEND_URL=http://localhost:$BACKEND_PORT|g" frontend/.env.local
sed -i '' "s|NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=http://localhost:$FRONTEND_PORT|g" frontend/.env.local

# Update backend .env
sed -i '' "s|FRONTEND_URL=.*|FRONTEND_URL=\"http://localhost:$FRONTEND_PORT\"|g" backend/.env
sed -i '' "s|BACKEND_PORT=.*|BACKEND_PORT=$BACKEND_PORT|g" backend/.env

echo -e "${GREEN}✅ Configuration updated${NC}"
echo ""

# Instructions for the user
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Ready to start!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Terminal 1 - Backend:${NC}"
echo -e "cd backend && ${YELLOW}BACKEND_PORT=$BACKEND_PORT FRONTEND_URL=http://localhost:$FRONTEND_PORT python main.py${NC}"
echo ""
echo -e "${BLUE}Terminal 2 - Frontend:${NC}"
echo -e "cd frontend && ${YELLOW}npm run dev -- --port $FRONTEND_PORT${NC}"
echo ""
echo -e "${BLUE}URLs:${NC}"
echo -e "  Frontend: ${GREEN}http://localhost:$FRONTEND_PORT${NC}"
echo -e "  Backend:  ${GREEN}http://localhost:$BACKEND_PORT${NC}"
echo -e "  Health:   ${GREEN}http://localhost:$BACKEND_PORT/health${NC}"
echo ""
