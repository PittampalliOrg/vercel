// src/components/providers/mcp-connection-provider.tsx
"use client";

import React, { createContext, useContext, type ReactNode } from "react";
import type { McpConnectionManagerContextType } from "@/lib/contexts/McpConnectionManagerContext"; // Import the new type
// Use the updated interface for the context type
const MCPConnectionContext = createContext<McpConnectionManagerContextType | undefined>(undefined);

export function McpConnectionManagerProvider({ children }: { children: ReactNode }) { // Renamed provider component
  const manager = useMcpConnectionManager(); // Get the manager object with new API

  return (
    <MCPConnectionContext.Provider value={manager}> {/* Provide the manager object */}
      {children}
    </MCPConnectionContext.Provider>
  );
}

// Renamed consumer hook
export function useMcpConnectionManager() {
  const context = useContext(MCPConnectionContext);
  if (context === undefined) {
    throw new Error("useMcpConnectionManager must be used within a McpConnectionManagerProvider");
  }
  return context;
}