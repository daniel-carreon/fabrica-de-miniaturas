#!/usr/bin/env node
/**
 * Smart Next.js dev server starter
 *
 * Priority:
 * 1. Use PORT from .env.local (if configured)
 * 2. Use PORT from CLI/environment
 * 3. Auto-detect first available port
 *
 * This allows: npm run dev (no CLI params needed)
 */
const { spawn } = require('child_process');
const net = require('net');
const fs = require('fs');
const path = require('path');

const MIN_PORT = 3000;
const MAX_PORT = 3006;

/**
 * Parse .env.local file (simple parser for PORT variable)
 */
function readPortFromEnv() {
  const envPath = path.join(process.cwd(), '.env.local');

  try {
    if (!fs.existsSync(envPath)) {
      return null;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const portMatch = envContent.match(/^PORT=(\d+)$/m);

    if (portMatch && portMatch[1]) {
      const port = parseInt(portMatch[1], 10);
      console.log(`📖 Read PORT from .env.local: ${port}`);
      return port;
    }
  } catch (error) {
    console.warn(`⚠️  Could not read .env.local: ${error.message}`);
  }

  return null;
}

/**
 * Check if a port is available
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port, '0.0.0.0');
  });
}

/**
 * Find first available port in range
 */
async function findAvailablePort() {
  for (let port = MIN_PORT; port <= MAX_PORT; port++) {
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
  }
  throw new Error(`No available ports found in range ${MIN_PORT}-${MAX_PORT}`);
}

/**
 * Start Next.js dev server
 */
async function startDevServer() {
  try {
    let port = null;

    // Priority 1: Try PORT from .env.local
    const envPort = readPortFromEnv();
    if (envPort) {
      const available = await isPortAvailable(envPort);
      if (available) {
        port = envPort;
        console.log(`✅ Using port ${port} from .env.local\n`);
      } else {
        console.warn(`⚠️  Port ${envPort} from .env.local is already in use`);
        console.warn(`🔍 Auto-detecting available port...\n`);
      }
    }

    // Priority 2: Try PORT from environment/CLI
    if (!port && process.env.PORT) {
      const cliPort = parseInt(process.env.PORT, 10);
      const available = await isPortAvailable(cliPort);
      if (available) {
        port = cliPort;
        console.log(`✅ Using port ${port} from environment\n`);
      }
    }

    // Priority 3: Auto-detect
    if (!port) {
      port = await findAvailablePort();
      console.log(`✅ Auto-detected available port: ${port}\n`);
    }

    const backendPort = 8000 + (port - 3000); // 3000→8000, 3001→8001, etc.

    console.log(`🚀 Starting Next.js dev server...`);
    console.log(`📍 Frontend: http://localhost:${port}`);
    console.log(`📍 Backend:  http://localhost:${backendPort}`);
    console.log(`💡 Tip: Edit PORT in .env.local to change dev port\n`);

    const nextDev = spawn('./node_modules/.bin/next', ['dev', '-p', port.toString()], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: port.toString(),
        NEXT_PUBLIC_BACKEND_URL: `http://localhost:${backendPort}`
      }
    });

    nextDev.on('error', (error) => {
      console.error('❌ Failed to start Next.js:', error);
      process.exit(1);
    });

    nextDev.on('close', (code) => {
      process.exit(code);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      nextDev.kill('SIGINT');
    });

    process.on('SIGTERM', () => {
      nextDev.kill('SIGTERM');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

startDevServer();
