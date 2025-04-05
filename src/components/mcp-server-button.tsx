// src/components/mcp-server-button.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react"; // Added useMemo
import { ServerIcon, CheckCircle, XCircle, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MCPConfigDialog } from "./mcp-config-dialog";
import { cn } from "@/lib/utils";
import { useMCPServers } from "@/components/providers/mcp-servers-provider";
// REMOVED: import { useSharedMcp } from "@/lib/contexts/SharedMcpContext";
import { useMcpConnectionManager } from "@/lib/contexts/McpConnectionManagerContext"; // <-- IMPORT NEW HOOK
import { McpConnectionStateType, McpConnectionState } from "@/lib/mcp/multi-connection-types"; // <-- IMPORT NEW TYPES
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export function MCPServerButton() {
  const { serverConfigs } = useMCPServers(); // Get configurations
  // USE NEW CONTEXT HOOK
  const {
    serverStates,
    connectToServer,
    disconnectFromServer,
    // getToolsForServer // Use if needed for aggregate count
  } = useMcpConnectionManager();

  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  // Optional: Local state if you want to track a "selected" server for display
  // const [displayServerName, setDisplayServerName] = useState<string | null>(null);

  // --- Calculate aggregate status/counts (Example) ---
  const { connectedCount, connectingCount, errorCount, totalToolCount } = useMemo(() => {
    let connected = 0;
    let connecting = 0;
    let error = 0;
    let tools = 0;
    Object.entries(serverStates).forEach(([name, state]) => {
        if (state.status.state === McpConnectionStateType.Running) {
            connected++;
            tools += state.tools.length;
        } else if (state.status.state === McpConnectionStateType.Starting) {
            connecting++;
        } else if (state.status.state === McpConnectionStateType.Error) {
            error++;
        }
    });
    return { connectedCount: connected, connectingCount: connecting, errorCount: error, totalToolCount: tools };
  }, [serverStates]);
  // --- End Aggregate Calculation ---

  const handleServerSelection = useCallback(async (name: string | null) => {
    if (name === null) {
      // Decide which server to disconnect - perhaps the 'displayServerName' if you implement that?
      // Or maybe this button should only disconnect ALL servers?
      // For now, let's make it disconnect the first connected/connecting one found for simplicity
      const serverToDisconnect = Object.entries(serverStates).find(([_, state]) =>
        state.status.state === McpConnectionStateType.Running || state.status.state === McpConnectionStateType.Starting
      )?.[0];
       if (serverToDisconnect) {
           console.log(`[MCPServerButton] Disconnecting ${serverToDisconnect}`);
           await disconnectFromServer(serverToDisconnect);
           // if (displayServerName === serverToDisconnect) setDisplayServerName(null);
       } else {
           console.log("[MCPServerButton] No server currently connected/connecting to disconnect.");
       }
    } else {
      const config = serverConfigs[name];
      if (config) {
        // setDisplayServerName(name); // Set if tracking locally
        const success = await connectToServer(config);
        // No need to reset displayServerName on failure here unless desired
      } else {
        toast.error(`Configuration for server "${name}" not found.`);
      }
    }
  }, [serverConfigs, serverStates, connectToServer, disconnectFromServer]); // Removed dependencies on old context

  const isAnythingConnecting = connectingCount > 0;
  const isAnythingConnected = connectedCount > 0;
  const hasAnyError = errorCount > 0;
  const hasConfigs = Object.keys(serverConfigs).length > 0;

  const getAggregateStatusColor = () => {
    if (hasAnyError) return "bg-red-500";
    if (isAnythingConnecting) return "bg-yellow-500 animate-pulse";
    if (isAnythingConnected) return "bg-green-500";
    return "bg-gray-400";
  };

  const getButtonVariant = () => {
      if (hasAnyError) return "destructive";
      if (isAnythingConnected) return "default";
      if (isAnythingConnecting) return "secondary";
      return "outline";
  }

  const getButtonText = () => {
      if (connectedCount > 0) return `MCP Servers (${connectedCount} Connected)`;
      if (isAnythingConnecting) return `MCP Servers (Connecting...)`;
      if (hasAnyError) return `MCP Servers (${errorCount} Error${errorCount > 1 ? 's' : ''})`;
      return "MCP Servers";
  }


  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={getButtonVariant()}
            size="sm"
            className={cn(
              "flex items-center gap-2 h-9 px-3 min-w-[160px] justify-between", // Adjusted min-width
              !hasConfigs && "border-dashed"
            )}
            disabled={isAnythingConnecting && connectedCount === 0} // Disable only if nothing is connected AND something is connecting
          >
            <div className="flex items-center gap-2 truncate">
              <div className={`relative flex h-2 w-2 mr-1`}>
                  <span className={cn("relative inline-flex rounded-full h-2 w-2", getAggregateStatusColor())} />
                  {isAnythingConnecting && <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", getAggregateStatusColor())} />}
              </div>
              <span className="truncate">{getButtonText()}</span>
               {isAnythingConnecting && <Loader className="h-4 w-4 animate-spin ml-1" />}
            </div>
             {isAnythingConnected && totalToolCount > 0 && <Badge variant="outline" className="ml-2 flex-shrink-0 text-xs">{totalToolCount} tools</Badge>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Select MCP Server</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {Object.entries(serverConfigs).map(([name, config]) => {
             // Get individual status from the new context's state map
             const currentServerState = serverStates[name]?.status ?? { state: McpConnectionStateType.Stopped };
             const isCurrentConnecting = currentServerState.state === McpConnectionStateType.Starting;
             const isCurrentConnected = currentServerState.state === McpConnectionStateType.Running;
             const isCurrentError = currentServerState.state === McpConnectionStateType.Error;

             return (
                <DropdownMenuItem key={name} onSelect={() => handleServerSelection(name)} disabled={isAnythingConnecting}>
                  {name}
                  {isCurrentConnected && <CheckCircle className="h-4 w-4 ml-auto text-green-500" />}
                  {isCurrentError && <XCircle className="h-4 w-4 ml-auto text-red-500" />}
                  {isCurrentConnecting && <Loader className="h-4 w-4 ml-auto animate-spin" />}
                </DropdownMenuItem>
             );
          })}
          {!hasConfigs && <DropdownMenuItem disabled>No servers configured</DropdownMenuItem>}
          <DropdownMenuSeparator />
           {/* Decide how global disconnect should work or remove it */}
           {/* <DropdownMenuItem onSelect={() => handleServerSelection(null)} disabled={isAnythingConnecting || (!isAnythingConnected && !hasAnyError)}>
              Disconnect First Active
           </DropdownMenuItem> */}
          <DropdownMenuItem onSelect={() => setIsConfigDialogOpen(true)}>
            Manage Configurations...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog for managing the list */}
      <MCPConfigDialog isOpen={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen} />
    </div>
  );
}