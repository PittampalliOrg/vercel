"use client"

import { useState, useEffect } from "react"
import { ServerIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MCPConfigDialog } from "./mcp-config-dialog"
import { cn } from "@/lib/utils"

export function MCPServerButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [activeServers, setActiveServers] = useState<string[]>([])

  // Load active servers from localStorage
  useEffect(() => {
    const loadActiveServers = () => {
      try {
        const storedActiveServers = localStorage.getItem("mcp-active-servers")
        if (storedActiveServers) {
          setActiveServers(JSON.parse(storedActiveServers))
        } else {
          setActiveServers([])
        }
      } catch (e) {
        console.error("Failed to load active servers from localStorage", e)
        setActiveServers([])
      }
    }

    // Load initially
    loadActiveServers()

    // Listen for changes to active servers
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "mcp-active-servers") {
        loadActiveServers()
      }
    }

    window.addEventListener("storage", handleStorageChange)

    // Custom event for same-window updates
    const handleCustomEvent = () => {
      loadActiveServers()
    }

    window.addEventListener("mcp-servers-updated" as any, handleCustomEvent)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("mcp-servers-updated" as any, handleCustomEvent)
    }
  }, [])

  const hasActiveServers = activeServers.length > 0

  return (
    <>
      <Button
        variant={hasActiveServers ? "default" : "outline"}
        size="sm"
        className={cn(
          "flex items-center gap-2 h-9 px-3",
          hasActiveServers ? "bg-green-600 hover:bg-green-700 text-white" : "border-dashed",
        )}
        onClick={() => setIsDialogOpen(true)}
      >
        <div className="flex items-center gap-2">
          <ServerIcon className="h-4 w-4" />
          <span>MCP Servers</span>
        </div>

        {hasActiveServers && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-700 text-white border-green-500 font-normal rounded-md px-1.5">
              {activeServers.length}
            </Badge>
            <StatusIndicator active={true} />
          </div>
        )}
      </Button>

      <MCPConfigDialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  )
}

function StatusIndicator({ active }: { active: boolean }) {
  return (
    <div className="relative flex h-3 w-3">
      <span
        className={cn(
          "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
          active ? "bg-white" : "bg-gray-400",
        )}
      />
      <span className={cn("relative inline-flex rounded-full h-3 w-3", active ? "bg-white" : "bg-gray-400")} />
    </div>
  )
}

