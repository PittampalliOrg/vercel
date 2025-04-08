import { experimental_createMCPClient as createMCPClient } from "ai"
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "ai/mcp-stdio"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

// Singleton instance
let mcpClientInstance: Awaited<ReturnType<typeof createMCPClient>> | null = null
let mcpToolsCache: any = null
let isInitializing = false
let lastUsedTimestamp = Date.now()

// Check if container exists and is running
async function isContainerRunning(containerName: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`docker ps --filter "name=${containerName}" --format "{{.Names}}"`)
    return stdout.trim() === containerName
  } catch (error) {
    console.error("Error checking if container is running:", error)
    return false
  }
}

// Initialize the MCP client
async function initializeMcpClient() {
  if (isInitializing) {
    // Wait for initialization to complete if already in progress
    let checkCount = 0
    while (isInitializing && checkCount < 30) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      checkCount++
    }

    if (mcpClientInstance) {
      return mcpClientInstance
    }
  }

  isInitializing = true

  try {
    // Check if container is already running
    const containerName = "mcp-time-service"
    const isRunning = await isContainerRunning(containerName)

    if (isRunning) {
      console.log(`Container ${containerName} is already running, connecting to it`)

      // Connect to existing container using SSE
      mcpClientInstance = await createMCPClient({
        transport: {
          type: "sse",
          url: `http://${containerName}:8007/sse`,
        },
      })
    } else {
      console.log(`Container ${containerName} is not running, starting a new one`)

      // Start a new container
      mcpClientInstance = await createMCPClient({
        transport: new StdioMCPTransport({
          command: "docker",
          args: ["run", "-i", "--rm", "--name", containerName, "--network", "shared-network", "mcp/time"],
        }),
      })
    }

    // Cache the tools
    mcpToolsCache = await mcpClientInstance.tools()
    console.log("MCP tools loaded:", Object.keys(mcpToolsCache))

    return mcpClientInstance
  } catch (error) {
    console.error("Failed to initialize MCP client:", error)
    mcpClientInstance = null
    mcpToolsCache = null
    throw error
  } finally {
    isInitializing = false
  }
}

// Get the MCP client (creates if needed)
export async function getMcpClient() {
  lastUsedTimestamp = Date.now()

  if (!mcpClientInstance) {
    return await initializeMcpClient()
  }

  return mcpClientInstance
}

// Get cached tools or fetch new ones
export async function getMcpTools() {
  lastUsedTimestamp = Date.now()

  if (mcpToolsCache) {
    return mcpToolsCache
  }

  const client = await getMcpClient()
  mcpToolsCache = await client.tools()
  return mcpToolsCache
}

// Close the MCP client
export async function closeMcpClient() {
  if (mcpClientInstance) {
    try {
      await mcpClientInstance.close()
      console.log("MCP client closed")
    } catch (error) {
      console.error("Error closing MCP client:", error)
    } finally {
      mcpClientInstance = null
      mcpToolsCache = null
    }
  }
}

// Set up auto-cleanup after inactivity (optional)
const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes
const INACTIVITY_THRESHOLD = 10 * 60 * 1000 // 10 minutes

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    if (mcpClientInstance && Date.now() - lastUsedTimestamp > INACTIVITY_THRESHOLD) {
      console.log("MCP client inactive, cleaning up")
      closeMcpClient()
    }
  }, CLEANUP_INTERVAL)
}

