// src/app/config.ts
export const config = {
  // Use localhost for browser connections
  proxyUrl: "http://localhost:3013", // process.env.NEXT_PUBLIC_PROXY_URL || 'http://localhost:3011',
  
  // API routes path without /frontend prefix
  apiBasePath: '/api/proxy',
  
  // Default timeout (ms) for regular requests
  requestTimeout: 30000,
  
  // Default MCP command
  defaultCommand: 'mcp-grafana',
  
  // Default environment values
  defaultEnv: {},
};