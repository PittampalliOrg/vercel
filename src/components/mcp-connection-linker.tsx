"use client";

import { useEffect, useRef } from 'react';
import { useMCPServers } from '@/components/providers/mcp-servers-provider';
import { useMcpConnectionManager } from '@/lib/contexts/McpConnectionManagerContext';
import { McpConnectionStateType } from '@/lib/mcp/multi-connection-types';

export function MCPConnectionLinker() {
    const { serverConfigs, activeServers } = useMCPServers();
    const { getConnectionState, connectToServer, disconnectFromServer } = useMcpConnectionManager();
    const prevActiveServersRef = useRef<string[]>([]);
    const processingRef = useRef<Set<string>>(new Set()); // Track servers being processed

    useEffect(() => {
        // console.log('[Linker] useEffect triggered. Active Servers:', activeServers);

        const currentActiveSet = new Set(activeServers);
        const prevActiveSet = new Set(prevActiveServersRef.current);

        // Connect newly activated servers
        activeServers.forEach(serverName => {
            // Skip if already active in previous state OR currently being processed
            if (!prevActiveSet.has(serverName) && !processingRef.current.has(serverName)) {
                const config = serverConfigs[serverName];
                const currentStatusState = getConnectionState(serverName);
                const currentStatus = currentStatusState?.state;

                // Only attempt connect if stopped or errored
                if (config && (currentStatus === undefined || currentStatus === McpConnectionStateType.Stopped || currentStatus === McpConnectionStateType.Error)) {
                    console.log(`[Linker] Attempting connect for newly activated server: ${serverName}`);
                    processingRef.current.add(serverName); // Mark as processing
                    connectToServer(config)
                        .catch((err: any) => {
                            console.error(`[Linker] ConnectToServer promise rejected for ${serverName}: ${err instanceof Error ? err.message : String(err)}`);
                        })
                        .finally(() => {
                            processingRef.current.delete(serverName); // Unmark when done
                        });
                } else if (!config) {
                    console.warn(`[Linker] Config not found for activated server: ${serverName}`);
                } else {
                    // Already connecting or running, do nothing
                    // console.log(`[Linker] Server ${serverName} already connecting/connected (${currentStatus !== undefined ? McpConnectionStateType[currentStatus] : 'undefined'}) or no config.`);
                }
            }
        });

        // Disconnect newly deactivated servers
        prevActiveServersRef.current.forEach(serverName => {
            // Skip if still active OR currently being processed
            if (!currentActiveSet.has(serverName) && !processingRef.current.has(serverName)) {
                const currentStatusState = getConnectionState(serverName);
                const currentStatus = currentStatusState?.state;
                // Disconnect if running or starting
                if (currentStatus === McpConnectionStateType.Running || currentStatus === McpConnectionStateType.Starting) {
                    console.log(`[Linker] Triggering disconnect for newly deactivated server: ${serverName}`);
                     processingRef.current.add(serverName); // Mark as processing
                    disconnectFromServer(serverName)
                        .catch((err: any) => {
                             console.error(`[Linker] DisconnectFromServer promise rejected for ${serverName}: ${err instanceof Error ? err.message : String(err)}`);
                        })
                        .finally(() => {
                             processingRef.current.delete(serverName); // Unmark when done
                        });
                }
            }
        });

        // Update previous state for the next comparison
        prevActiveServersRef.current = [...activeServers];
    }, [activeServers, serverConfigs, connectToServer, disconnectFromServer, getConnectionState]);

    return null;
}