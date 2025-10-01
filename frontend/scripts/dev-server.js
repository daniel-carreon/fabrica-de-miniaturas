#!/usr/bin/env node
/**
 * Auto-detect available port and start Next.js dev server
 * Tries ports 3000-3006 automatically
 */
const { spawn } = require('child_process');
const net = require('net');

const MIN_PORT = 3000;
const MAX_PORT = 3006;

/**
 * Check if a port is available (checks both IPv4 and IPv6)
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

    // Listen on all interfaces (both IPv4 and IPv6)
    // This matches Next.js behavior which binds to ::
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
 * Start Next.js dev server on available port
 */
async function startDevServer() {
  try {
    const port = await findAvailablePort();
    const backendPort = 8000 + (port - 3000); // 3000→8000, 3001→8001, etc.

    console.log(`\n🚀 Starting Next.js on port ${port}...`);
    console.log(`💡 Expected backend port: ${backendPort}`);
    console.log(`   Run: cd ../backend && python dev_server.py\n`);

    const nextDev = spawn('./node_modules/.bin/next', ['dev', '-p', port.toString()], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: port.toString(),
        NEXT_PUBLIC_API_URL: `http://localhost:${backendPort}`
      }
    });

    nextDev.on('error', (error) => {
      console.error('Failed to start Next.js:', error);
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
