/**
 * Port detection utility for dynamic backend connection
 * Automatically finds available backend port
 */

const BACKEND_PORTS = [8000, 8001, 8002, 8003, 8004]

interface PortTestResult {
  port: number
  available: boolean
  responseTime?: number
}

/**
 * Test if a backend is running on a specific port
 */
async function testBackendPort(port: number): Promise<PortTestResult> {
  const startTime = Date.now()

  try {
    const response = await fetch(`http://localhost:${port}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000) // 2 second timeout
    })

    const responseTime = Date.now() - startTime

    return {
      port,
      available: response.ok,
      responseTime
    }
  } catch (error) {
    return {
      port,
      available: false
    }
  }
}

/**
 * Find the first available backend port
 * Returns the port number or null if no backend is found
 */
export async function detectBackendPort(): Promise<number | null> {
  console.log('🔍 Detecting backend port...')

  // Test all ports in parallel for speed
  const testPromises = BACKEND_PORTS.map(port => testBackendPort(port))
  const results = await Promise.all(testPromises)

  // Find the first available port
  const availablePort = results.find(result => result.available)

  if (availablePort) {
    console.log(`✅ Backend found on port ${availablePort.port} (${availablePort.responseTime}ms)`)
    return availablePort.port
  }

  console.warn('⚠️ No backend found on any port:', BACKEND_PORTS)
  return null
}

/**
 * Get the backend URL with automatic port detection
 * Falls back to port 8000 if detection fails
 */
export async function getBackendUrl(): Promise<string> {
  // 1. Check for a production URL first
  const prodUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (prodUrl) {
    console.log(`🚀 Using production backend URL: ${prodUrl}`);
    return prodUrl;
  }

  // 2. If no production URL, proceed with local development detection
  console.log('🏠 In development mode, detecting local backend port...');

  // Try to read port from environment first
  const envPort = process.env.NEXT_PUBLIC_BACKEND_PORT;
  if (envPort) {
    const port = parseInt(envPort);
    const result = await testBackendPort(port);
    if (result.available) {
      return `http://localhost:${port}`;
    }
  }

  // Auto-detect port
  const detectedPort = await detectBackendPort();
  if (detectedPort) {
    return `http://localhost:${detectedPort}`;
  }

  // Fallback to default
  console.warn('🔄 Falling back to default port 8000');
  return 'http://localhost:8000';
}

/**
 * Create a fetch wrapper that automatically uses the correct backend URL
 */
export async function backendFetch(endpoint: string, options: RequestInit = {}) {
  const baseUrl = await getBackendUrl()
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  console.log(`📡 Backend request: ${options.method || 'GET'} ${url}`)

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })
}