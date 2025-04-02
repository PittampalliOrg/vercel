// src/app/(mcp)/components/mcp-interaction-panel.tsx
"use client";

import React from "react"; // Import React
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConnectionState } from "@/lib/mcp/types";
import { Files, Hammer, MessageSquare, Bell, AlertTriangle, Loader2 } from "lucide-react"; // Added Loader2
// Import actual Tab components (assuming they exist at these paths)
import { McpResourcesTab } from "./mcp-resources-tab";
import { McpPromptsTab } from "./mcp-prompts-tab";
import { McpToolsTab } from "./mcp-tools-tab";
import { McpPingTab } from "./mcp-ping-tab";
// Placeholder for loading/error state within tabs if needed
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

interface McpInteractionPanelProps {
  serverName: string;
  connectionState: ConnectionState;
}

export function McpInteractionPanel({ serverName, connectionState }: McpInteractionPanelProps) {
  const capabilities = connectionState.capabilities;
  const status = connectionState.status;

  if (status === 'connecting') {
    return (
      <div className="p-4 text-muted-foreground flex items-center justify-center h-full gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Connecting to {serverName}...
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="p-4 text-destructive flex flex-col items-center justify-center h-full text-center gap-2">
        <AlertTriangle className="h-6 w-6" />
        <span>Connection Error for {serverName}:</span>
        <span className="text-xs">{connectionState.error}</span>
      </div>
    );
  }

  // If status is not connected for any other reason (e.g., disconnected), show message
  if (status !== 'connected') {
    return <div className="p-4 text-muted-foreground flex items-center justify-center h-full">Server not connected.</div>;
  }

  // --- Status is 'connected' ---

  // Determine default tab, defaulting to 'ping' if no capabilities known
  const defaultTab = capabilities?.resources ? "resources" :
                    capabilities?.prompts ? "prompts" :
                    capabilities?.tools ? "tools" : "ping";

  const noCapabilitiesKnown = !capabilities; // Check if capabilities object is null/undefined

  return (
    <Tabs defaultValue={defaultTab} className="w-full h-full flex flex-col">
      <TabsList className="mb-4 shrink-0">
        {/* Disable tabs based on capabilities object, but allow selection even if null initially */}
        <TabsTrigger value="resources" disabled={!capabilities || !capabilities.resources}>
          <Files className="w-4 h-4 mr-2" /> Resources
        </TabsTrigger>
        <TabsTrigger value="prompts" disabled={!capabilities || !capabilities.prompts}>
          <MessageSquare className="w-4 h-4 mr-2" /> Prompts
        </TabsTrigger>
        <TabsTrigger value="tools" disabled={!capabilities || !capabilities.tools}>
          <Hammer className="w-4 h-4 mr-2" /> Tools
        </TabsTrigger>
        <TabsTrigger value="ping">
          <Bell className="w-4 h-4 mr-2" /> Ping
        </TabsTrigger>
      </TabsList>

      {/* Optional: Show a subtle indicator if capabilities are missing */}
      {noCapabilitiesKnown && (
        <div className="px-1 pb-2">
          <Alert variant="default" className="text-xs py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Capabilities Unknown</AlertTitle>
            <AlertDescription>
              Server capabilities not yet determined. Tabs might be disabled.
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-4">
          {/* Render tabs - they need to handle null capabilities */}
          <TabsContent value="resources" className="mt-0 h-full focus-visible:ring-0 focus-visible:ring-offset-0">
            <McpResourcesTab serverName={serverName} capabilities={capabilities} />
          </TabsContent>
          <TabsContent value="prompts" className="mt-0 h-full focus-visible:ring-0 focus-visible:ring-offset-0">
            <McpPromptsTab serverName={serverName} capabilities={capabilities} />
          </TabsContent>
          <TabsContent value="tools" className="mt-0 h-full focus-visible:ring-0 focus-visible:ring-offset-0">
            <McpToolsTab serverName={serverName} capabilities={capabilities} />
          </TabsContent>
          <TabsContent value="ping" className="mt-0 h-full focus-visible:ring-0 focus-visible:ring-offset-0">
            <McpPingTab serverName={serverName} />
          </TabsContent>
        </ScrollArea>
      </div>
    </Tabs>
  );
}