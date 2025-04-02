"use client";

import { useState, useEffect, useMemo } from "react";
import { useMCPConnections } from "@/components/mcp-connection-provider"; // Corrected path
import { McpInteractionPanel } from "@/components/mcp-interaction-panel"; // Relative path assumed
import { McpHistoryPanel } from "@/components/mcp-history-panel"; // Relative path assumed
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MCPConfigForm } from "@/components/mcp-config-form"; // Corrected path

export default function MCPInspectorPage() {
  // Get specific selectors and actions
  const {
    getConnectionState, // Still used to get full state for panels
    getConnectionStatus,
    getConnectedServerNames,
    clearHistory
  } = useMCPConnections();
  const [selectedServerName, setSelectedServerName] = useState<string | null>(null);

  // --- Refined Selection Logic ---

  // Get the stable list of connected names using the selector
  const connectedServerNames = getConnectedServerNames();

  // Get the status of the *currently* selected server using the selector
  const selectedServerStatus = selectedServerName
    ? getConnectionStatus(selectedServerName)
    : null;


  // Effect to handle selection/deselection
  useEffect(() => {
    console.log(`[MCP Page Effect Check] Selected: ${selectedServerName}, Status: ${selectedServerStatus}, Connected List: [${connectedServerNames.join(', ')}]`);

    // If a server is selected, but its status is no longer 'connected', deselect it
    if (selectedServerName && selectedServerStatus !== 'connected') {
      console.log(`[MCP Page] Deselecting ${selectedServerName} because status changed to ${selectedServerStatus}`);
      setSelectedServerName(null);
    }
    // If nothing is selected AND there are connected servers, select the first one
    else if (!selectedServerName && connectedServerNames.length > 0) {
      const serverToSelect = connectedServerNames[0];
      console.log(`[MCP Page] Auto-selecting first connected server: ${serverToSelect}`);
      setSelectedServerName(serverToSelect);
    }
    // No action needed if already selected and still connected, or if nothing connected

  // Dependencies now only react to actual connection *status* changes or selection changes
  }, [connectedServerNames, selectedServerName, selectedServerStatus]); // Use derived status

  // --- End Refined Selection Logic ---

  // Retrieve the full state *for rendering panels*, outside the effect
  const selectedConnectionState = selectedServerName ? getConnectionState(selectedServerName) : null;

  console.log(`[MCP Page] Final Render Check - Selected: ${selectedServerName}, Status: ${selectedConnectionState?.status}`);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={30} minSize={25} maxSize={50}>
          <ScrollArea className="h-full p-1">
            {/* MCPConfigForm uses its own hook now */}
            <MCPConfigForm />
            {/* TODO: Need mechanism for MCPConfigForm list items to call setSelectedServerName */}
          </ScrollArea>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={70}>
          <ResizablePanelGroup direction="vertical" className="h-full">
            <ResizablePanel defaultSize={65} minSize={30}>
              <div className="h-full p-4 overflow-auto">
                {selectedServerName && selectedConnectionState && selectedConnectionState.status === 'connected' ? (
                  <McpInteractionPanel
                    serverName={selectedServerName}
                    connectionState={selectedConnectionState}
                  />
                ) : selectedConnectionState?.status === 'connecting' ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Connecting to {selectedServerName}...
                  </div>
                ) : selectedConnectionState?.status === 'error' ? (
                  <div className="flex items-center justify-center h-full text-destructive p-4 text-center">
                    Connection Error for {selectedServerName}:<br/> {selectedConnectionState.error}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Activate a server and connect to interact.
                  </div>
                )}
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={35} minSize={20}>
              <div className="h-full overflow-hidden">
                {selectedServerName && selectedConnectionState ? (
                  <McpHistoryPanel
                    serverName={selectedServerName}
                    connectionState={selectedConnectionState}
                    onClearHistory={clearHistory}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    History and notifications will appear here for the selected server.
                  </div>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}