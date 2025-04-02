// src/hooks/use-mcp-servers.tsx
"use client";

import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from "react";
import { useLocalStorage } from "./use-local-storage"; // Corrected path assumption
import type { ServerConfig } from "@/lib/mcp/config"; // Import shared config type
import { toast } from "sonner";

// Local storage key for configurations
const CONFIG_STORAGE_KEY = "mcp-server-configs"; // Use a distinct key
// Local storage key for active server names
const ACTIVE_STORAGE_KEY = "mcp-active-servers";

interface MCPServersContextType {
  serverConfigs: Record<string, ServerConfig>; // Renamed from 'servers'
  activeServers: string[];
  addServerConfig: (config: ServerConfig) => void;
  updateServerConfig: (serverName: string, config: ServerConfig) => void;
  removeServerConfig: (serverName: string) => void;
  activateServer: (serverName: string) => void;
  deactivateServer: (serverName: string) => void;
  isServerActive: (serverName: string) => boolean;
}

const MCPServersContext = createContext<MCPServersContextType | undefined>(undefined);

export function MCPServersProvider({ children }: { children: ReactNode }) {
  const [configs, setConfigs] = useLocalStorage<Record<string, ServerConfig>>(CONFIG_STORAGE_KEY, {});
  // Use local state for active servers, persisted separately via useEffect
  const [activeServers, setActiveServers] = useState<string[]>([]);

  // Load active servers from localStorage on initial mount
  useEffect(() => {
    const storedActive = localStorage.getItem(ACTIVE_STORAGE_KEY);
    if (storedActive) {
      try {
        const parsed = JSON.parse(storedActive);
        // Ensure only configured servers are marked active initially
        if (Array.isArray(parsed)) {
          const validActive = parsed.filter(name => name in configs);
          setActiveServers(validActive);
        }
      } catch (e) {
        console.error("Failed to parse active servers from localStorage", e);
        localStorage.removeItem(ACTIVE_STORAGE_KEY); // Clear corrupted data
      }
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Removed 'configs' dependency to avoid race conditions on init

  // Persist active servers whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_STORAGE_KEY, JSON.stringify(activeServers));
    } catch (e) {
      console.error("Failed to save active servers to localStorage", e);
    }
  }, [activeServers]);

  const addServerConfig = useCallback((config: ServerConfig) => {
    setConfigs(prev => {
      if (prev[config.name]) {
        toast.error(`Server with name "${config.name}" already exists.`);
        return prev;
      }
      return { ...prev, [config.name]: config };
    });
    console.info(`Added MCP server config: ${config.name}`);
  }, [setConfigs]);

  const updateServerConfig = useCallback((serverName: string, config: ServerConfig) => {
    setConfigs(prev => {
      if (!prev[serverName]) {
        toast.error(`Server "${serverName}" not found for update.`);
        return prev;
      }
      // If name changes, need to handle removal of old key and potential deactivation
      const newConfigs = { ...prev };
      if (serverName !== config.name) {
        delete newConfigs[serverName];
        // If the renamed server was active, deactivate the old name
        setActiveServers(act => act.filter(name => name !== serverName));
      }
      newConfigs[config.name] = config;
      console.info(`Updated MCP server config: ${config.name}`);
      return newConfigs;
    });
    // If name changed, we might need to explicitly deactivate the old connection
    // This logic is handled by the linking component/hook
  }, [setConfigs]);

  const removeServerConfig = useCallback((serverName: string) => {
    setConfigs(prev => {
      const { [serverName]: _, ...rest } = prev;
      return rest;
    });
    // Also deactivate if it was active
    setActiveServers((prev) => prev.filter((name) => name !== serverName));
    console.info(`Removed MCP server config: ${serverName}`);
    // Actual disconnect logic is handled by the linking component/hook
  }, [setConfigs]);

  const activateServer = useCallback((serverName: string) => {
    if (!configs[serverName]) {
      console.warn(`Attempted to activate non-existent server config: ${serverName}`);
      return;
    }
    setActiveServers((prev) => {
      if (!prev.includes(serverName)) {
        console.info(`Activating server: ${serverName}`);
        return [...prev, serverName];
      }
      return prev; // Already active
    });
  }, [configs]);

  const deactivateServer = useCallback((serverName: string) => {
    setActiveServers((prev) => {
      if (prev.includes(serverName)) {
        console.info(`Deactivating server: ${serverName}`);
        return prev.filter((name) => name !== serverName);
      }
      return prev; // Already inactive
    });
  }, []);

  const isServerActive = useCallback((serverName: string) => {
    return activeServers.includes(serverName);
  }, [activeServers]);


  return (
    <MCPServersContext.Provider
      value={{
        serverConfigs: configs,
        activeServers,
        addServerConfig,
        updateServerConfig,
        removeServerConfig,
        activateServer,
        deactivateServer,
        isServerActive,
      }}
    >
      {children}
    </MCPServersContext.Provider>
  );
}

export function useMCPServers() {
  const context = useContext(MCPServersContext);
  if (context === undefined) {
    throw new Error("useMCPServers must be used within a MCPServersProvider");
  }
  return context;
}