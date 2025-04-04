"use client";

import { useState, useEffect, useCallback } from "react";
import { ServerIcon, CheckCircle, XCircle, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MCPConfigDialog } from "./mcp-config-dialog"; // Dialog to manage list
import { cn } from "@/lib/utils";
import { useMCPServers } from "@/components/providers/mcp-servers-provider"; // Hook to get available configs
import { useSharedMcp } from "@/lib/contexts/SharedMcpContext"; // Hook for connection state/actions
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // Use dropdown for selection
import { toast } from "sonner";

export function MCPServerButton() {
  const { serverConfigs } = useMCPServers(); // Get the list of saved configs
  const {
    connectionStatus,
    selectedServerName,
    setSelectedServerName, // Function to update selected server in context
    connectMcpServer,
    disconnectMcpServer,
    fetchedMcpTools, // Get tools to show count
  } = useSharedMcp(); // Get connection state and actions

  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);

  const handleServerSelection = useCallback(async (name: string | null) => {
    if (name === null) {
       // Disconnect if null is selected
       if (connectionStatus === 'connected' || connectionStatus === 'connecting') {
         await disconnectMcpServer();
       }
       setSelectedServerName(null);
    } else {
      const config = serverConfigs[name];
      if (config) {
        setSelectedServerName(name); // Update context about the intent
        const success = await connectMcpServer(config); // Attempt connection
        if (!success) {
            setSelectedServerName(null); // Revert selection on connection failure
        }
      } else {
        toast.error(`Configuration for server "${name}" not found.`);
      }
    }
  }, [serverConfigs, connectionStatus, disconnectMcpServer, setSelectedServerName, connectMcpServer]);

  const isConnecting = connectionStatus === 'connecting';
  const isConnected = connectionStatus === 'connected';
  const isError = connectionStatus === 'error';
  const hasConfigs = Object.keys(serverConfigs).length > 0;

  const getStatusColor = () => {
    if (isConnected) return "bg-green-500";
    if (isConnecting) return "bg-yellow-500 animate-pulse";
    if (isError) return "bg-red-500";
    return "bg-gray-400";
  };

  const getButtonVariant = () => {
      if (isConnected) return "default";
      if (isConnecting || isError) return "secondary";
      return "outline";
  }

  const getButtonText = () => {
      if (isConnected && selectedServerName) return selectedServerName;
      if (isConnecting && selectedServerName) return `Connecting: ${selectedServerName}...`;
      if (isError && selectedServerName) return `Error: ${selectedServerName}`;
      return "MCP Server";
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={getButtonVariant()}
            size="sm"
            className={cn(
              "flex items-center gap-2 h-9 px-3 min-w-[120px] justify-between", // Ensure minimum width
              !hasConfigs && "border-dashed"
            )}
            disabled={isConnecting} // Disable while connecting
          >
            <div className="flex items-center gap-2 truncate">
              <div className={`relative flex h-2 w-2 mr-1`}>
                  <span className={cn("relative inline-flex rounded-full h-2 w-2", getStatusColor())} />
                  {isConnecting && <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", getStatusColor())} />}
              </div>
              <span className="truncate">{getButtonText()}</span>
               {isConnecting && <Loader className="h-4 w-4 animate-spin ml-1" />}
            </div>
             {isConnected && <Badge variant="outline" className="ml-2 flex-shrink-0 text-xs">{fetchedMcpTools.length} tools</Badge>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Select MCP Server</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {Object.keys(serverConfigs).map((name) => (
            <DropdownMenuItem key={name} onSelect={() => handleServerSelection(name)} disabled={isConnecting}>
              {name}
              {selectedServerName === name && isConnected && <CheckCircle className="h-4 w-4 ml-auto text-green-500" />}
               {selectedServerName === name && isError && <XCircle className="h-4 w-4 ml-auto text-red-500" />}
               {selectedServerName === name && isConnecting && <Loader className="h-4 w-4 ml-auto animate-spin" />}
            </DropdownMenuItem>
          ))}
          {!hasConfigs && <DropdownMenuItem disabled>No servers configured</DropdownMenuItem>}
          <DropdownMenuSeparator />
           <DropdownMenuItem onSelect={() => handleServerSelection(null)} disabled={isConnecting || connectionStatus === 'disconnected'}>
              Disconnect
           </DropdownMenuItem>
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