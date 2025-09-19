#!/usr/bin/env python3
"""
Auto-fallback server starter for FastAPI backend
Tries ports 8000, 8001, 8002 automatically
"""
import socket
import subprocess
import sys
import os

def is_port_available(port):
    """Check if a port is available."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind(('localhost', port))
            return True
        except OSError:
            return False

def find_available_port(start_port=8000, max_attempts=5):
    """Find the first available port starting from start_port."""
    for i in range(max_attempts):
        port = start_port + i
        if is_port_available(port):
            return port
    return None

def start_backend():
    """Start backend with automatic port fallback."""
    port = find_available_port()

    if port is None:
        print("❌ Error: No available ports found (tried 8000-8004)")
        sys.exit(1)

    print(f"🚀 Starting backend on port {port}")
    print(f"📡 Backend URL: http://localhost:{port}")

    # Write port to a file for frontend to read
    with open('.port', 'w') as f:
        f.write(str(port))

    # Start uvicorn
    try:
        subprocess.run([
            'uvicorn', 'main:app',
            '--reload',
            '--host', '0.0.0.0',
            '--port', str(port)
        ], check=True)
    except KeyboardInterrupt:
        print("\n👋 Backend stopped")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to start backend: {e}")
        sys.exit(1)

if __name__ == "__main__":
    start_backend()