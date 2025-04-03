"use client";

import { useEffect, useRef } from 'react';
import { useMCPServers } from '@/components/providers/mcp-servers-provider';
import { useMCPConnections } from '@/components/mcp-connection-provider';

export function MCPConnectionLinker() {
  console.log("[Linker] Component Rendered");
  const { serverConfigs, activeServers } = useMCPServers();
  const { getConnectionStatus, connect, disconnect } = useMCPConnections();
  const prevActiveServersRef = useRef<string[]>([]);

  useEffect(() => {
    console.log('[Linker] useEffect triggered. Active Servers:', activeServers);

    const currentActiveSet = new Set(activeServers);
    const prevActiveSet = new Set(prevActiveServersRef.current);

    activeServers.forEach(serverName => {
      if (!prevActiveSet.has(serverName)) {
        const config = serverConfigs[serverName];
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
        const currentStatus = getConnectionStatus(serverName);
        if (currentStatus === 'connected' || currentStatus === 'connecting') {
          console.log(`[Linker] Triggering disconnect for newly deactivated server: ${serverName}`);
          disconnect(serverName);
        }
      }
    });

    // Update previous state for the next comparison
    prevActiveServersRef.current = [...activeServers];
  }, [activeServers, serverConfigs, connect, disconnect, getConnectionStatus]);

  return null;
}