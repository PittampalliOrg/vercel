"use client"

import { useState, useEffect } from "react"
import { ServerIcon, XCircleIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

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

export function ActiveMCPServers() {
  const [activeServers, setActiveServers] = useState<string[]>([])
  const [servers, setServers] = useState<Record<string, ServerConfig>>({})

  // Load data from localStorage on mount
  useEffect(() => {
    const loadData = () => {
      try {
        const storedActiveServers = localStorage.getItem("mcp-active-servers")
        if (storedActiveServers) {
          setActiveServers(JSON.parse(storedActiveServers))
        } else {
          setActiveServers([])
        }

        const storedConfigs = localStorage.getItem("mcp-agent-state")
        if (storedConfigs) {
          setServers(JSON.parse(storedConfigs))
        } else {
          setServers({})
        }
      } catch (e) {
        console.error("Failed to load MCP data from localStorage", e)
      }
    }

    // Load initially
    loadData()

    // Listen for changes
    const handleStorageChange = () => {
      loadData()
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("mcp-servers-updated" as any, handleStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("mcp-servers-updated" as any, handleStorageChange)
    }
  }, [])

  const deactivateServer = (serverName: string) => {
    const newActiveServers = activeServers.filter((name) => name !== serverName)
    setActiveServers(newActiveServers)
    localStorage.setItem("mcp-active-servers", JSON.stringify(newActiveServers))

    // Dispatch custom event
    try {
      window.dispatchEvent(new CustomEvent("mcp-servers-updated", { detail: newActiveServers }))
    } catch (e) {
      console.error("Failed to dispatch custom event", e)
    }
  }

  if (activeServers.length === 0) {
    return null
  }

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-2 mb-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
        <div className="w-full text-xs font-medium text-green-800 dark:text-green-300 mb-1 flex items-center">
          <div className="relative mr-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </div>
          Active MCP Servers:
        </div>
        {activeServers.map((serverName) => {
          const server = servers[serverName]
          if (!server) return null

          return (
            <Tooltip key={serverName}>
              <TooltipTrigger asChild>
                <Badge
                  variant="secondary"
                  className="flex items-center gap-1 pl-1.5 pr-1 py-1 group bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-800 dark:text-green-300"
                >
                  <div className="h-2 w-2 rounded-full bg-green-500 mr-1.5"></div>
                  <ServerIcon className="h-3 w-3 mr-1" />
                  <span>{serverName}</span>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      deactivateServer(serverName)
                    }}
                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <XCircleIcon className="h-3.5 w-3.5 text-green-700/70 dark:text-green-400/70 hover:text-red-500" />
                  </button>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <p className="font-medium">{serverName}</p>
                  <p className="text-muted-foreground">
                    {server.transport === "stdio" ? `${server.command} ${server.args.join(" ")}` : server.url}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}

