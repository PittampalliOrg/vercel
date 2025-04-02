"use client";

import { useEffect, useRef } from 'react';
import { useMCPServers } from '@/components/providers/mcp-servers-provider';
// Import specific selectors/actions needed
import { useMCPConnections } from '@/components/mcp-connection-provider'; // Corrected path

export function MCPConnectionLinker() {
  console.log("[Linker] Component Rendered");
  const { serverConfigs, activeServers } = useMCPServers();
  // Get specific functions/selectors needed
  const { getConnectionStatus, connect, disconnect } = useMCPConnections();
  const prevActiveServersRef = useRef<string[]>([]);

  useEffect(() => {
    // Log using the selector
    console.log('[Linker] useEffect triggered. Active Servers:', activeServers);

    const currentActiveSet = new Set(activeServers);
    const prevActiveSet = new Set(prevActiveServersRef.current);

    activeServers.forEach(serverName => {
      if (!prevActiveSet.has(serverName)) {
        const config = serverConfigs[serverName];
        // Use the selector function to get status
        const currentStatus = getConnectionStatus(serverName);
        if (config && (currentStatus === undefined || currentStatus === 'disconnected' || currentStatus === 'error')) {
          console.log(`[Linker] Attempting connect for newly activated server: ${serverName}`);
          connect(serverName, config).catch(err => {
            console.error(`[Linker] Connect() promise rejected for ${serverName}: ${err instanceof Error ? err.message : String(err)}`);
          });
        } else if (!config) {
          console.warn(`[Linker] Config not found for activated server: ${serverName}`);
        } else {
          console.log(`[Linker] Server ${serverName} already connecting/connected (${currentStatus}) or no config.`);
        }
      }
    });

    prevActiveServersRef.current.forEach(serverName => {
      if (!currentActiveSet.has(serverName)) {
        // Use the selector function
        const currentStatus = getConnectionStatus(serverName);
        if (currentStatus === 'connected' || currentStatus === 'connecting') {
          console.log(`[Linker] Triggering disconnect for newly deactivated server: ${serverName}`);
          disconnect(serverName);
        }
      }
    });

    // Update previous state for the next comparison
    prevActiveServersRef.current = [...activeServers];

    // Dependencies: Only depend on things that change when activation state changes,
    // or when connect/disconnect/selector functions themselves change (which they shouldn't now).
  }, [activeServers, serverConfigs, connect, disconnect, getConnectionStatus]);

  return null;
}