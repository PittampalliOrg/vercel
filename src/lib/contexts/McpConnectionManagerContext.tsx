
'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useRef, useEffect, useMemo } from 'react';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport, SseError, SSEClientTransportOptions } from "@modelcontextprotocol/sdk/client/sse.js"; // Import SseError and SSEClientTransportOptions
import {
    ClientRequest, ServerCapabilities, Tool as McpToolDefinition, Result, ListToolsResultSchema, // Use Tool as McpToolDefinition
    McpError,
    CompleteResultSchema, ResourceReference, PromptReference, ClientNotification,
    CompatibilityCallToolResultSchema, Request as McpApiRequest, Notification as McpApiNotification,
    ErrorCode
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { toast } from "sonner";
import type { ServerConfig } from '@/lib/mcp/config';
import {
    McpConnectionState, McpConnectionStateType, McpServerRuntimeState
} from '@/lib/mcp/multi-connection-types';
import { StdErrNotificationSchema, type Notification as BackendNotification } from '@/app/(mcp)/lib/notificationTypes'; // Adjust path
import { generateUUID } from '@/lib/utils'; // Assuming this exists

const PACKAGE_VERSION = process.env.NEXT_PUBLIC_PACKAGE_VERSION || 'dev';
const ACTUAL_PROXY_SERVER_URL = process.env.NEXT_PUBLIC_PROXY_SERVER_URL || 'http://localhost:3013';
const REQUEST_TIMEOUT = 30000; // 30 seconds

// --- Context Type ---
export interface McpConnectionManagerContextType {
    serverStates: Readonly<Record<string, McpServerRuntimeState>>;
    connectToServer: (config: ServerConfig) => Promise<boolean>;
    disconnectFromServer: (serverName: string) => Promise<void>;
    makeRequest: <T extends z.ZodType>(serverName: string, request: ClientRequest, schema: T) => Promise<z.output<T>>;
    getToolsForServer: (serverName: string) => McpToolDefinition[];
    getCapabilitiesForServer: (serverName: string) => ServerCapabilities | null;
    getConnectionState: (serverName: string) => McpConnectionState | undefined;
    getConnectedServerNames: () => string[]; // Added definition
}

const McpConnectionManagerContext = createContext<McpConnectionManagerContextType | undefined>(undefined);

// --- Provider Implementation ---
export function McpConnectionManagerProvider({ children }: { children: ReactNode }) {
    const [serverStates, setServerStates] = useState<Record<string, McpServerRuntimeState>>({});
    const clientInstancesRef = useRef<Record<string, Client>>({});
    const eventSourcesRef = useRef<Record<string, EventSource>>({});

    // --- Helper to update state for a specific server ---
    const updateServerState = useCallback((serverName: string, updates: Partial<McpServerRuntimeState>) => {
        setServerStates(prev => {
            const currentState = prev[serverName] ?? { // Initial state if not present
                serverName: serverName,
                status: { state: McpConnectionStateType.Stopped },
                capabilities: null,
                tools: [],
            };
            const newState = { ...currentState, ...updates };

            // Use JSON stringify for a simple deep comparison proxy
            if (JSON.stringify(prev[serverName]) === JSON.stringify(newState)) {
                return prev;
            }
            return { ...prev, [serverName]: newState };
        });
    }, []);

    // --- Disconnect Logic ---
    const disconnectFromServer = useCallback(async (serverName: string) => {
        console.log(`[McpConnectionManager] Disconnecting from ${serverName}...`);
        const client = clientInstancesRef.current[serverName];
        const eventSource = eventSourcesRef.current[serverName];

        if (client) {
            try {
                await client.close();
                console.log(`[McpConnectionManager] SDK Client closed for ${serverName}`);
            } catch (e) {
                console.error(`[McpConnectionManager] Error closing SDK client for ${serverName}:`, e);
            }
            delete clientInstancesRef.current[serverName];
        }

        if (eventSource && eventSource.readyState !== EventSource.CLOSED) {
            eventSource.close();
            console.log(`[McpConnectionManager] EventSource closed for ${serverName}`);
            delete eventSourcesRef.current[serverName];
        }

        if (serverStates[serverName]?.status.state !== McpConnectionStateType.Stopped) {
            updateServerState(serverName, {
                status: { state: McpConnectionStateType.Stopped },
                capabilities: null,
                tools: [],
            });
        }
        console.log(`[McpConnectionManager] Disconnected from ${serverName}.`);

        try {
            await fetch(`${ACTUAL_PROXY_SERVER_URL}/disconnect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serverName }),
            });
            console.log(`[McpConnectionManager] Sent disconnect signal to proxy for ${serverName}`);
        } catch (e) {
            console.error(`[McpConnectionManager] Failed to send disconnect signal to proxy for ${serverName}:`, e);
        }

    }, [updateServerState, serverStates]); // Added serverStates dependency

    // --- Connect Logic ---
    const connectToServer = useCallback(async (config: ServerConfig): Promise<boolean> => {
        const { name: serverName } = config;

        const currentState = serverStates[serverName]?.status.state;
        if (currentState === McpConnectionStateType.Running || currentState === McpConnectionStateType.Starting) {
            console.log(`[McpConnectionManager] Server ${serverName} is already ${currentState}. Skipping connect.`);
            return currentState === McpConnectionStateType.Running;
        }

        console.log(`[McpConnectionManager] Connecting to ${serverName}...`);
        updateServerState(serverName, { status: { state: McpConnectionStateType.Starting } });

        try {
            const client = new Client<McpApiRequest, McpApiNotification, Result>(
                { name: "mcp-manager-client", version: PACKAGE_VERSION },
                { capabilities: { /* Define client capabilities */ } }
            );

            const targetProxySseUrl = new URL(`${ACTUAL_PROXY_SERVER_URL}/sse`);
            targetProxySseUrl.searchParams.append("serverName", serverName);
            targetProxySseUrl.searchParams.append("transportType", config.transport);

            if (config.transport === "stdio") {
                targetProxySseUrl.searchParams.append("command", config.command);
                if (config.args) targetProxySseUrl.searchParams.append("args", config.args.join(' ')); // Join args for URL
                if (config.env) targetProxySseUrl.searchParams.append("env", JSON.stringify(config.env));
            } else { // sse
                targetProxySseUrl.searchParams.append("url", config.url);
                if (config.headers) targetProxySseUrl.searchParams.append("headers", JSON.stringify(config.headers));
            }

            console.log(`[McpConnectionManager] Initializing SSEClientTransport for ${serverName} -> ${targetProxySseUrl.toString()}`);

            // Define options separately
            const transportOptions: SSEClientTransportOptions = {
                 eventSourceInit: {},
                 // The SSEClientTransportOptions type doesn't seem to expose a direct hook like this anymore.
                 // Instead, the EventSource instance needs to be managed externally if direct access is needed,
                 // or rely on the transport's own error/close handling which propagates via the Client.
                 // We'll store the EventSource via a side-effect within the constructor or start method if possible,
                 // but the SDK might abstract this away now.
                 // Let's assume the SDK handles propagation and remove this option.
                 // onEventSourceCreated: (es: EventSource) => { ... } // Removed (TS2353)
            };

            const clientTransport = new SSEClientTransport(targetProxySseUrl, transportOptions);

            // --- Setup Handlers ---
            client.setNotificationHandler(StdErrNotificationSchema, (notification) => {
                console.error(`[${serverName} stderr]:`, notification.params.content);
            });
            client.fallbackNotificationHandler = (notification: BackendNotification): Promise<void> => {
                console.log(`[${serverName} Notification]:`, notification);
                return Promise.resolve();
            };

            // Setup EventSource listeners externally IF the SDK doesn't expose the instance easily
            // This is a workaround if onEventSourceCreated is truly gone.
            // We connect to the *same* proxy URL, but ONLY for listening to errors/close, not for MCP messages.
            const monitoringEventSource = new EventSource(targetProxySseUrl.toString());
            eventSourcesRef.current[serverName] = monitoringEventSource; // Store for cleanup
            monitoringEventSource.onerror = (ev: Event | MessageEvent) => {
                console.error(`[McpConnectionManager] EventSource error for ${serverName}:`, ev);
                const errorMessage = ev instanceof MessageEvent && ev.data ? String(ev.data) : "SSE connection error";
                updateServerState(serverName, {
                    status: { state: McpConnectionStateType.Error, message: errorMessage },
                });
                disconnectFromServer(serverName);
            };
            // Add onopen listener if needed for initial connection status confirmation
            // monitoringEventSource.onopen = () => { /* Potentially update status if needed */ };


            await client.connect(clientTransport);
            console.log(`[McpConnectionManager] Connected successfully to ${serverName}`);

            clientInstancesRef.current[serverName] = client;

            const capabilities = client.getServerCapabilities() ?? null;
            updateServerState(serverName, {
                status: { state: McpConnectionStateType.Running },
                capabilities: capabilities,
            });

            let tools: McpToolDefinition[] = [];
            if (capabilities?.tools) {
                try {
                    const toolsResponse = await client.request({ method: "tools/list" }, ListToolsResultSchema);
                    tools = toolsResponse.tools;
                    console.log(`[McpConnectionManager] Fetched ${tools.length} tools from ${serverName}`);
                } catch (toolError: any) {
                    console.error(`[McpConnectionManager] Failed to fetch tools from ${serverName}:`, toolError);
                    toast.error(`[${serverName}] Failed to fetch tools: ${toolError.message || String(toolError)}`);
                    updateServerState(serverName, { tools: [] });
                }
            }
            updateServerState(serverName, { tools });

            return true;

        } catch (error: any) {
            const errorMessage = error.message || String(error);
            console.error(`[McpConnectionManager] Failed to connect to ${serverName}:`, error);
            updateServerState(serverName, {
                status: { state: McpConnectionStateType.Error, message: errorMessage },
                capabilities: null,
                tools: [],
            });
            toast.error(`[${serverName}] Connection failed: ${errorMessage}`);
            delete clientInstancesRef.current[serverName];
            delete eventSourcesRef.current[serverName]; // Clean up monitor EventSource too
            return false;
        }
    }, [serverStates, updateServerState, disconnectFromServer]);

    // --- Make Request Logic ---
    const makeRequest = useCallback(async <T extends z.ZodType>(
        serverName: string,
        request: ClientRequest,
        schema: T,
    ): Promise<z.output<T>> => {
        const client = clientInstancesRef.current[serverName];
        const serverState = serverStates[serverName];

        if (!client || serverState?.status.state !== McpConnectionStateType.Running) {
            throw new Error(`MCP client for "${serverName}" is not connected or not running.`);
        }

        let timeoutId: NodeJS.Timeout | undefined;
        const requestPromise = client.request(request, schema);

        const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(new Error(`Request to "${serverName}" timed out after ${REQUEST_TIMEOUT / 1000}s`));
            }, REQUEST_TIMEOUT);
        });

        try {
            console.log(`[${serverName} Request]:`, JSON.stringify(request));
            const response = await Promise.race([requestPromise, timeoutPromise]);
            console.log(`[${serverName} Response]:`, JSON.stringify(response));
            return response;
        } catch (error: any) {
            const errorMessage = error.message || String(error);
            console.error(`[${serverName} Request Error]:`, errorMessage, "Request:", JSON.stringify(request));
            if (!error.message?.includes("timed out")) {
                toast.error(`[${serverName}] MCP Request Failed: ${errorMessage}`);
            }

            // Example check, use actual SDK error code/type if available
            const isConnectionError = error instanceof McpError && error.code === -32000;
            const isSseErrorInstance = error instanceof SseError;

            // Check against known error codes if `ConnectionError` isn't exported
            // const isConnectionErrorCode = error instanceof McpError && (error.code === ErrorCode.InternalError || error.code === ErrorCode.ConnectionError); // Check specific codes

            if (isConnectionError || isSseErrorInstance) {
                updateServerState(serverName, { status: { state: McpConnectionStateType.Error, message: `Connection lost during request: ${errorMessage}` } });
                await disconnectFromServer(serverName); // Attempt cleanup
            }
            throw error;
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }
    }, [serverStates, updateServerState, disconnectFromServer]); // Added dependencies

    // --- Getters ---
    const getToolsForServer = useCallback((serverName: string): McpToolDefinition[] => {
        return serverStates[serverName]?.tools ?? [];
    }, [serverStates]);

    const getCapabilitiesForServer = useCallback((serverName: string): ServerCapabilities | null => {
        return serverStates[serverName]?.capabilities ?? null;
    }, [serverStates]);

    const getConnectionState = useCallback((serverName: string): McpConnectionState | undefined => {
        return serverStates[serverName]?.status;
    }, [serverStates]);

    const connectedServerNames = useMemo(() => {
        return Object.entries(serverStates)
            .filter(([, state]) => state.status.state === McpConnectionStateType.Running)
            .map(([name]) => name);
    }, [serverStates]);

    const getConnectedServerNames = useCallback(() => {
        return connectedServerNames;
    }, [connectedServerNames]);

    // --- Cleanup on Unmount ---
    useEffect(() => {
        return () => {
            console.log("[McpConnectionManager] Unmounting. Disconnecting all servers...");
            Object.keys(clientInstancesRef.current).forEach(name => {
                disconnectFromServer(name);
            });
            clientInstancesRef.current = {};
            eventSourcesRef.current = {};
        };
    }, [disconnectFromServer]); // Ensure disconnectFromServer is stable or listed


    // --- Context Value ---
    const contextValue: McpConnectionManagerContextType = useMemo(() => ({
        serverStates,
        connectToServer,
        disconnectFromServer,
        makeRequest,
        getToolsForServer,
        getCapabilitiesForServer,
        getConnectionState,
        getConnectedServerNames,
        clearHistory: (serverName: string) => { console.warn("clearHistory not implemented"); /* Keep if needed */ }
    }), [
        serverStates, connectToServer, disconnectFromServer, makeRequest,
        getToolsForServer, getCapabilitiesForServer, getConnectionState, getConnectedServerNames
    ]);

    return (
        <McpConnectionManagerContext.Provider value={contextValue}>
            {children}
        </McpConnectionManagerContext.Provider>
    );
}

// --- Hook ---
export function useMcpConnectionManager() {
    const context = useContext(McpConnectionManagerContext);
    if (context === undefined) {
        throw new Error('useMcpConnectionManager must be used within a McpConnectionManagerProvider');
    }
    return context;
}