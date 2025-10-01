#!/usr/bin/env python3
"""
Auto-detect available port and start FastAPI dev server
Tries ports 8000-8006 automatically
"""
import socket
import sys
import os
import subprocess

MIN_PORT = 8000
MAX_PORT = 8006

def is_port_available(port: int) -> bool:
    """Check if a port is available"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('127.0.0.1', port))
            return True
    except OSError:
        return False

def find_available_port() -> int:
    """Find first available port in range"""
    for port in range(MIN_PORT, MAX_PORT + 1):
        if is_port_available(port):
            return port
    raise RuntimeError(f"No available ports found in range {MIN_PORT}-{MAX_PORT}")

def start_dev_server():
    """Start FastAPI dev server on available port"""
    try:
        port = find_available_port()
        frontend_port = 3000 + (port - 8000)  # 8000→3000, 8001→3001, etc.

        print(f"\n🚀 Starting FastAPI on port {port}...")
        print(f"💡 Expected frontend port: {frontend_port}")
        print(f"   Frontend should be at: http://localhost:{frontend_port}\n")

        # Set PORT environment variable
        os.environ['PORT'] = str(port)
        os.environ['FRONTEND_PORT'] = str(frontend_port)

        # Start uvicorn
        subprocess.run([
            "uvicorn",
            "main:app",
            "--reload",
            "--host", "0.0.0.0",
            "--port", str(port)
        ])

    except KeyboardInterrupt:
        print("\n\n👋 Server stopped")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    start_dev_server()
