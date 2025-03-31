"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

// Types
type ConnectionType = "stdio" | "sse"
interface StdioConfig {
  command: string
  args: string[]
  transport: "stdio"
}
interface SSEConfig {
  url: string
  transport: "sse"
}
type ServerConfig = StdioConfig | SSEConfig

// Local storage key
const STORAGE_KEY = "mcp-agent-state"

interface MCPServersContextType {
  servers: Record<string, ServerConfig>
  activeServers: string[]
  toggleServer: (serverName: string) => void
  isServerActive: (serverName: string) => boolean
  activateServer: (serverName: string) => void
  deactivateServer: (serverName: string) => void
  addServer: (name: string, config: ServerConfig) => void
  removeServer: (name: string) => void
}

const MCPServersContext = createContext<MCPServersContextType | undefined>(undefined)

export function MCPServersProvider({ children }: { children: ReactNode }) {
  const [servers, setServers] = useState<Record<string, ServerConfig>>({})
  const [activeServers, setActiveServers] = useState<string[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load configs and active servers from localStorage on mount
  useEffect(() => {
    try {
      // Load configs
      const storedConfigs = localStorage.getItem(STORAGE_KEY)
      if (storedConfigs) {
        setServers(JSON.parse(storedConfigs))
      }

      // Load active servers
      const storedActiveServers = localStorage.getItem("mcp-active-servers")
      if (storedActiveServers) {
        setActiveServers(JSON.parse(storedActiveServers))
      }

      setIsLoaded(true)
    } catch (e) {
      console.error("Failed to load MCP data from localStorage", e)
      setIsLoaded(true)
    }
  }, [])

  // Save configs to localStorage when they change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(servers))
    }
  }, [servers, isLoaded])

  // Save active servers to localStorage when they change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("mcp-active-servers", JSON.stringify(activeServers))

      // Dispatch custom event for same-window updates
      try {
        window.dispatchEvent(new CustomEvent("mcp-servers-updated", { detail: activeServers }))
      } catch (e) {
        console.error("Failed to dispatch custom event", e)
      }
    }
  }, [activeServers, isLoaded])

  const toggleServer = (serverName: string) => {
    setActiveServers((prev) => {
      if (prev.includes(serverName)) {
        return prev.filter((name) => name !== serverName)
      } else {
        return [...prev, serverName]
      }
    })
  }

  const isServerActive = (serverName: string) => {
    return activeServers.includes(serverName)
  }

  const activateServer = (serverName: string) => {
    if (!activeServers.includes(serverName)) {
      setActiveServers((prev) => [...prev, serverName])
    }
  }

  const deactivateServer = (serverName: string) => {
    setActiveServers((prev) => prev.filter((name) => name !== serverName))
  }

  const addServer = (name: string, config: ServerConfig) => {
    setServers((prev) => ({ ...prev, [name]: config }))
  }

  const removeServer = (name: string) => {
    setServers((prev) => {
      const newServers = { ...prev }
      delete newServers[name]
      return newServers
    })

    // Also remove from active servers if it's active
    if (activeServers.includes(name)) {
      deactivateServer(name)
    }
  }

  return (
    <MCPServersContext.Provider
      value={{
        servers,
        activeServers,
        toggleServer,
        isServerActive,
        activateServer,
        deactivateServer,
        addServer,
        removeServer,
      }}
    >
      {children}
    </MCPServersContext.Provider>
  )
}

export function useMCPServers() {
  const context = useContext(MCPServersContext)
  if (context === undefined) {
    throw new Error("useMCPServers must be used within a MCPServersProvider")
  }
  return context
}

