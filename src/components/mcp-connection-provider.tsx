// src/components/providers/mcp-connection-provider.tsx
"use client";

import React, { createContext, useContext, type ReactNode } from "react";
// Import the MANAGER interface
import { type MCPConnectionManager, useMCPConnectionManager } from "@/hooks/use-mcp-connection-manager";

// Use the updated interface for the context type
const MCPConnectionContext = createContext<MCPConnectionManager | undefined>(undefined);

export function MCPConnectionProvider({ children }: { children: ReactNode }) {
  const manager = useMCPConnectionManager(); // Get the manager object with new API

  return (
    <MCPConnectionContext.Provider value={manager}> {/* Provide the manager object */}
      {children}
    </MCPConnectionContext.Provider>
  );
}

// Consumer hook remains the same, returns the manager object
export function useMCPConnections(): MCPConnectionManager {
  const context = useContext(MCPConnectionContext);
  if (context === undefined) {
    throw new Error("useMCPConnections must be used within a MCPConnectionProvider");
  }
  return context;
}