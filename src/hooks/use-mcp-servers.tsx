"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useLocalStorage } from "../app/(mcp)/hooks/useLocalStorage"

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
}

const MCPServersContext = createContext<MCPServersContextType | undefined>(undefined)

export function MCPServersProvider({ children }: { children: ReactNode }) {
  const [configs, setConfigs] = useLocalStorage<Record<string, ServerConfig>>(STORAGE_KEY, {})
  const [activeServers, setActiveServers] = useState<string[]>([])

  // Load active servers from localStorage on mount
  useEffect(() => {
    const storedActiveServers = localStorage.getItem("mcp-active-servers")
    if (storedActiveServers) {
      try {
        const parsed = JSON.parse(storedActiveServers)
        setActiveServers(parsed)
      } catch (e) {
        console.error("Failed to parse active servers from localStorage", e)
      }
    }
  }, [])

  // Save active servers to localStorage when they change
  useEffect(() => {
    localStorage.setItem("mcp-active-servers", JSON.stringify(activeServers))
  }, [activeServers])

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

  return (
    <MCPServersContext.Provider
      value={{
        servers: configs,
        activeServers,
        toggleServer,
        isServerActive,
        activateServer,
        deactivateServer,
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

