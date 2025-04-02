// src/app/(mcp)/components/mcp-interaction-panel.tsx
"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConnectionState } from "@/lib/mcp/types";
import type { ServerCapabilities } from "@modelcontextprotocol/sdk/types.js";
import { Files, Hammer, MessageSquare, Bell, AlertTriangle, Loader2 } from "lucide-react";
import { McpResourcesTab } from "./mcp-resources-tab";
import { McpPromptsTab } from "./mcp-prompts-tab";
import { McpToolsTab } from "./mcp-tools-tab";
import { McpPingTab } from "./mcp-ping-tab";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface McpInteractionPanelProps {
  serverName: string;
  connectionState: ConnectionState;
}

export function McpInteractionPanel({ serverName, connectionState }: McpInteractionPanelProps) {
  const capabilities = connectionState.capabilities;
  const status = connectionState.status;

  console.log(`[Interaction Panel] Rendering for ${serverName}. Status: ${status}. Capabilities:`, capabilities);

  if (status === 'connecting') {
    return <div className="p-4 text-muted-foreground flex items-center justify-center h-full gap-2"><Loader2 className="h-4 w-4 animate-spin" />Connecting to {serverName}...</div>;
  }
  if (status === 'error') {
     return <div className="p-4 text-destructive flex flex-col items-center justify-center h-full text-center gap-2"><AlertTriangle className="h-6 w-6" /><span>Connection Error for {serverName}:</span><span className="text-xs">{connectionState.error}</span></div>;
  }
  if (status !== 'connected') {
     return <div className="p-4 text-muted-foreground flex items-center justify-center h-full">Server not connected.</div>;
  }

  // --- Status is 'connected' ---

  // Capabilities might still be null here
  const noCapabilitiesKnown = !capabilities;

  // Determine default tab, defaulting to 'ping' if no capabilities known
  const defaultTab = capabilities?.resources ? "resources" :
                   capabilities?.prompts ? "prompts" :
                   capabilities?.tools ? "tools" : "ping";

  console.log(`[Interaction Panel] Default Tab: ${defaultTab}, No Capabilities Known: ${noCapabilitiesKnown}`); // Debug log

  return (
    <Tabs defaultValue={defaultTab} className="w-full h-full flex flex-col">
      <TabsList className="mb-4 shrink-0">
        {/* REMOVE the disabled prop - let users click, handle in tab content */}
        <TabsTrigger value="resources" >
          <Files className="w-4 h-4 mr-2" /> Resources
        </TabsTrigger>
        <TabsTrigger value="prompts" >
          <MessageSquare className="w-4 h-4 mr-2" /> Prompts
        </TabsTrigger>
        <TabsTrigger value="tools" >
          <Hammer className="w-4 h-4 mr-2" /> Tools
        </TabsTrigger>
        <TabsTrigger value="ping">
          <Bell className="w-4 h-4 mr-2" /> Ping
        </TabsTrigger>
      </TabsList>

      {noCapabilitiesKnown && (
         <div className="px-1 pb-2">
           <Alert variant="default" className="text-xs py-2">
             <AlertTriangle className="h-4 w-4" />
             <AlertTitle>Capabilities Unknown</AlertTitle>
             <AlertDescription>
               Server capabilities not yet determined. Features may be unavailable.
             </AlertDescription>
           </Alert>
         </div>
      )}

      <div className="flex-1 overflow-hidden mt-2">
        <ScrollArea className="h-full pr-4">
          {/* Pass capabilities (which might be null) to tabs */}
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