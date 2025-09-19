#!/bin/bash
"""
🚀 Auto-fallback Development Server Starter
Starts both frontend and backend with automatic port detection
"""

echo "🚀 Starting Daniel Flux Context with Auto-fallback Ports"
echo "=================================================="

# Function to kill background processes on exit
cleanup() {
    echo "🛑 Stopping all services..."
    jobs -p | xargs -r kill
    echo "👋 Goodbye!"
}
trap cleanup EXIT

# Start backend with auto-fallback
echo "🔧 Starting backend (auto-fallback: 8000→8001→8002)..."
cd backend && python start_server.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Read the actual port used by backend
if [ -f "backend/.port" ]; then
    BACKEND_PORT=$(cat backend/.port)
    echo "✅ Backend started on port $BACKEND_PORT"
    export NEXT_PUBLIC_BACKEND_PORT=$BACKEND_PORT
else
    echo "⚠️ Backend port not detected, using default"
fi

# Start frontend
echo "🎨 Starting frontend (auto-fallback: 3000→3001→3002)..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "🎉 Both services started successfully!"
echo "📱 Frontend: Check your terminal for the actual port (usually 3000 or 3001)"
echo "🔧 Backend: Port $BACKEND_PORT"
echo ""
echo "🔄 Auto-fallback active - services will find available ports automatically"
echo "Press Ctrl+C to stop all services"

# Wait for all background jobs
wait