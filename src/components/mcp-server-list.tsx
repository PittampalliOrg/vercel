// src/app/(mcp)/components/mcp-server-list.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ServerConfig } from "@/lib/mcp/config";
import { ConnectionState } from "@/lib/mcp/types";
import { cn } from "@/lib/utils";
import { PlugZap, Unplug, PlusCircle, Settings, Trash2 } from "lucide-react";
import { McpServerConfigDialog } from "@/components/mcp-server-config-dialog"; // Import the dialog
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useMCPServers } from "@/hooks/use-mcp-servers";

interface McpServerListProps {
  serverConfigs: Record<string, ServerConfig>;
  connections: Map<string, ConnectionState>;
  activeServers: string[];
  selectedServerName: string | null;
  onSelectServer: (serverName: string) => void;
  onActivateServer: (serverName: string) => void;
  onDeactivateServer: (serverName: string) => void;
}

export function McpServerList({
  serverConfigs,
  connections,
  activeServers,
  selectedServerName,
  onSelectServer,
  onActivateServer,
  onDeactivateServer,
}: McpServerListProps) {
  const { removeServerConfig } = useMCPServers();
  const [editingServerName, setEditingServerName] = useState<string | undefined>(undefined);
  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = useState(false);

  const sortedServerNames = Object.keys(serverConfigs).sort();

  const getStatusIndicator = (serverName: string): React.ReactNode => {
    // ... (getStatusIndicator function remains the same as previous step)
    const isActive = activeServers.includes(serverName);
    const state = connections.get(serverName);

    if (!isActive && (!state || state.status === 'disconnected')) {
      return <span className="w-2 h-2 rounded-full bg-gray-400" title="Inactive"></span>;
    }
    if (state?.status === "connecting") {
      return <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" title="Connecting"></span>;
    }
    if (state?.status === "connected") {
      return <span className="w-2 h-2 rounded-full bg-green-500" title="Connected"></span>;
    }
    if (state?.status === "error") {
      return <span className="w-2 h-2 rounded-full bg-red-500" title={`Error: ${state.error}`}></span>;
    }
    return <span className="w-2 h-2 rounded-full bg-gray-400" title="Inactive/Pending"></span>;
  };

  const handleEdit = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    setEditingServerName(name);
    setIsAddEditDialogOpen(true);
  }

  const handleAdd = () => {
    setEditingServerName(undefined);
    setIsAddEditDialogOpen(true);
  }

  const handleRemove = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    removeServerConfig(name);
    if (selectedServerName === name) {
      onSelectServer(''); // Deselect if removed
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold mb-2">MCP Servers</h2>
      <McpServerConfigDialog
        serverName={editingServerName}
        onOpenChange={setIsAddEditDialogOpen}
      >
        <Button variant="outline" size="sm" className="mb-2 w-full" onClick={handleAdd}>
          <PlusCircle className="h-4 w-4 mr-2" /> Add Server
        </Button>
      </McpServerConfigDialog>

      {sortedServerNames.length === 0 && (
        <p className="text-sm text-muted-foreground">No servers configured.</p>
      )}
      {sortedServerNames.map((name) => {
        const config = serverConfigs[name];
        const isActive = activeServers.includes(name);
        const isSelected = selectedServerName === name;
        const state = connections.get(name);
        const isConnectable = state?.status === 'connected' || state?.status === 'connecting';

        return (
          <div
            key={name}
            className={cn(
              "flex items-center gap-1 p-2 rounded-md border cursor-pointer", // Reduced gap
              isSelected ? "border-primary bg-muted" : "hover:bg-muted/50",
              !isConnectable && !isActive ? "opacity-60" : ""
            )}
            onClick={() => onSelectServer(name)}
          >
            {getStatusIndicator(name)}
            <span className="flex-1 truncate font-medium text-sm ml-1" title={name}>{name}</span>
            <span className="text-xs text-muted-foreground">{config.transport}</span>

            {/* Edit Button - Triggers Dialog */}
            <McpServerConfigDialog serverName={name}>
              <Button variant="ghost" size="icon" className="h-6 w-6" title="Edit Config" onClick={(e) => e.stopPropagation()}>
                <Settings size={14} />
              </Button>
            </McpServerConfigDialog>

            {/* Activate/Deactivate Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title={isActive ? "Deactivate" : "Activate"}
              onClick={(e) => {
                e.stopPropagation();
                isActive ? onDeactivateServer(name) : onActivateServer(name);
              }}
            >
              {isActive ? <Unplug size={14} /> : <PlugZap size={14} />}
            </Button>

            {/* Remove Button with Confirmation */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" title="Remove Server" onClick={(e) => e.stopPropagation()}>
                  <Trash2 size={14} />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove the configuration for "{name}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => handleRemove(e, name)}
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      })}
    </div>
  );
}