// src/components/providers/mcp-servers-provider.tsx
"use client";

import React, { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from "react";
import type { ServerConfig } from "@/lib/mcp/config"; // Ensure this path is correct

// Local storage keys
const CONFIG_STORAGE_KEY = "mcp-server-configs";
const ACTIVE_STORAGE_KEY = "mcp-active-servers";

// Define the CORRECT Context Type based on implementation
interface MCPServersContextType {
  serverConfigs: Record<string, ServerConfig>; // Exposed state name
  activeServers: string[];
  addServerConfig: (config: ServerConfig) => boolean; // Exposed function name and signature
  updateServerConfig: (serverName: string, config: ServerConfig) => void; // Added update function
  removeServerConfig: (serverName: string) => void; // Exposed function name
  activateServer: (serverName: string) => void;
  deactivateServer: (serverName: string) => void;
  toggleServer: (serverName: string) => void;
  isServerActive: (serverName: string) => boolean;
}

const MCPServersContext = createContext<MCPServersContextType | undefined>(undefined);

export function MCPServersProvider({ children }: { children: ReactNode }) {
  const [serverConfigs, setServerConfigs] = useState<Record<string, ServerConfig>>({});
  const [activeServers, setActiveServers] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount (no changes needed here)
  useEffect(() => {
    console.log("[MCPServersProvider] Initializing state from localStorage...");
    try {
      const storedConfigs = localStorage.getItem(CONFIG_STORAGE_KEY);
      const initialConfigs = storedConfigs ? JSON.parse(storedConfigs) : {};
      setServerConfigs(initialConfigs);

      const storedActive = localStorage.getItem(ACTIVE_STORAGE_KEY);
      const initialActive = storedActive ? JSON.parse(storedActive) : [];

      if (Array.isArray(initialActive)) {
        const validActive = initialActive.filter(name => name in initialConfigs);
        setActiveServers(validActive);
        console.log("[MCPServersProvider] Loaded active servers:", validActive);
      } else {
        setActiveServers([]);
      }
    } catch (e) {
      console.error("Failed to load MCP data from localStorage", e);
      setServerConfigs({});
      setActiveServers([]);
    } finally {
      setIsLoaded(true);
      console.log("[MCPServersProvider] State initialized.");
    }
  }, []);

  // Persist configs (no changes needed here)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(serverConfigs));
    }
  }, [serverConfigs, isLoaded]);

  // Persist active servers (no changes needed here)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(ACTIVE_STORAGE_KEY, JSON.stringify(activeServers));
    }
  }, [activeServers, isLoaded]);

  // --- Actions (Implementation - keep internal names) ---
  const internalAddServerConfig = useCallback((config: ServerConfig): boolean => {
    if (config.name in serverConfigs) {
      console.warn(`[MCPServersProvider] Add failed: Server name "${config.name}" already exists.`);
      alert(`Server with name "${config.name}" already exists.`);
      return false;
    }
    console.log(`[MCPServersProvider] Adding server config: ${config.name}`);
    setServerConfigs((prev) => ({ ...prev, [config.name]: config }));
    return true;
  }, [serverConfigs]); // Added dependency

  const internalUpdateServerConfig = useCallback((serverName: string, config: ServerConfig) => {
    console.log(`[MCPServersProvider] Updating server config: ${serverName} -> ${config.name}`);
    setServerConfigs(prev => {
      if (!prev[serverName]) {
        console.error(`[MCPServersProvider] Update failed: Server "${serverName}" not found.`);
        alert(`Server "${serverName}" not found for update.`);
        return prev;
      }
      const newConfigs = { ...prev };
      if (serverName !== config.name) {
        delete newConfigs[serverName];
        setActiveServers(act => act.map(name => name === serverName ? config.name : name));
      }
      newConfigs[config.name] = config;
      return newConfigs;
    });
  }, []);

  const internalRemoveServerConfig = useCallback((serverName: string) => {
    console.log(`[MCPServersProvider] Removing server config: ${serverName}`);
    setServerConfigs(prev => {
      const { [serverName]: _, ...rest } = prev;
      return rest;
    });
    setActiveServers((prev) => prev.filter((name) => name !== serverName));
  }, []);

  const internalActivateServer = useCallback((serverName: string) => {
    if (!(serverName in serverConfigs)) {
      console.warn(`[MCPServersProvider] Activate failed: Config not found for ${serverName}`);
      return;
    }
    setActiveServers((prev) => {
      if (!prev.includes(serverName)) {
        console.log(`[MCPServersProvider] Activating server: ${serverName}`);
        return [...prev, serverName];
      }
      return prev;
    });
  }, [serverConfigs]);

  const internalDeactivateServer = useCallback((serverName: string) => {
    setActiveServers((prev) => {
      if (prev.includes(serverName)) {
        console.log(`[MCPServersProvider] Deactivating server: ${serverName}`);
        return prev.filter((name) => name !== serverName);
      }
      return prev;
    });
  }, []);

  const internalToggleServer = useCallback((serverName: string) => {
    if (activeServers.includes(serverName)) {
      internalDeactivateServer(serverName);
    } else {
      internalActivateServer(serverName);
    }
  }, [activeServers, internalActivateServer, internalDeactivateServer]);

  const internalIsServerActive = useCallback((serverName: string) => {
    return activeServers.includes(serverName);
  }, [activeServers]);

  // --- Provide Value (Use CORRECT names matching the Interface) ---
  const value: MCPServersContextType = {
    serverConfigs, // Use the correct state variable name
    activeServers,
    addServerConfig: internalAddServerConfig, // Assign implementation to correct interface key
    updateServerConfig: internalUpdateServerConfig, // Assign implementation
    removeServerConfig: internalRemoveServerConfig, // Assign implementation to correct interface key
    activateServer: internalActivateServer,
    deactivateServer: internalDeactivateServer,
    toggleServer: internalToggleServer,
    isServerActive: internalIsServerActive,
  };

  return (
    <MCPServersContext.Provider value={value}>
      {children}
    </MCPServersContext.Provider>
  );
}

// Export the Consumer Hook from the same file
export function useMCPServers(): MCPServersContextType {
  const context = useContext(MCPServersContext);
  if (context === undefined) {
    throw new Error("useMCPServers must be used within a MCPServersProvider");
  }
  return context;
}