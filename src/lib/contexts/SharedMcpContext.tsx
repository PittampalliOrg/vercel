'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"; // Using older SDK transport
import {
  ClientRequest, ServerCapabilities, Tool, Result, ListToolsResultSchema,
  McpError, ErrorCode, CompleteResultSchema, ResourceReference, PromptReference, ClientNotification,
  CompatibilityCallToolResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { toast } from "sonner";
import { ServerConfig } from '@/lib/mcp/config';
import { Notification, StdErrNotificationSchema } from '@/app/(mcp)/lib/notificationTypes'; // Adjust path if needed

const PACKAGE_VERSION = process.env.NEXT_PUBLIC_PACKAGE_VERSION || 'dev'; // Use NEXT_PUBLIC_ for browser access

// --- Get the ACTUAL proxy server URL accessible from the BROWSER ---
// Ensure this env var is prefixed with NEXT_PUBLIC_ if defined in .env
const ACTUAL_PROXY_SERVER_URL = process.env.NEXT_PUBLIC_PROXY_SERVER_URL || 'http://localhost:3013'; // Default for local dev if not set

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

interface RequestOptions {
  signal?: AbortSignal;
  timeout?: number;
  suppressToast?: boolean;
}

interface SharedMcpContextType {
  connectionStatus: ConnectionStatus;
  serverCapabilities: ServerCapabilities | null;
  mcpClient: Client | null; // Older SDK Client
  fetchedMcpTools: Tool[];
  selectedServerName: string | null;
  setSelectedServerName: (name: string | null) => void;
  connectMcpServer: (config: ServerConfig) => Promise<boolean>;
  disconnectMcpServer: () => Promise<void>;
  makeRequest: <T extends z.ZodType>(request: ClientRequest, schema: T, options?: RequestOptions) => Promise<z.output<T>>;
  sendNotification: (notification: ClientNotification) => Promise<void>;
  requestHistory: { request: string; response?: string }[];
  completionsSupported: boolean;
  handleCompletion: (ref: ResourceReference | PromptReference, argName: string, value: string, signal?: AbortSignal) => Promise<string[]>;
}

const SharedMcpContext = createContext<SharedMcpContextType | undefined>(undefined);

export function SharedMcpProvider({ children }: { children: ReactNode }) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [serverCapabilities, setServerCapabilities] = useState<ServerCapabilities | null>(null);
  const [mcpClient, setMcpClient] = useState<Client | null>(null);
  const [fetchedMcpTools, setFetchedMcpTools] = useState<Tool[]>([]);
  const [selectedServerName, setSelectedServerName] = useState<string | null>(null);
  const [requestHistory, setRequestHistory] = useState<{ request: string; response?: string }[]>([]);
  const [completionsSupported, setCompletionsSupported] = useState(true);

  const requestTimeout = 30000;
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    clientRef.current = mcpClient;
  }, [mcpClient]);

  const pushHistory = useCallback((request: object, response?: object) => {
    setRequestHistory((prev) => [
      ...prev,
      {
        request: JSON.stringify(request),
        response: response !== undefined ? JSON.stringify(response) : undefined,
      },
    ]);
  }, []);

  const disconnectMcpServer = useCallback(async () => {
    console.log("[SharedMcpContext] Disconnecting MCP client...");
    await clientRef.current?.close();
    setMcpClient(null);
    clientRef.current = null;
    setConnectionStatus("disconnected");
    setCompletionsSupported(false);
    setServerCapabilities(null);
    setFetchedMcpTools([]);
    setRequestHistory([]);
    setSelectedServerName(null);
    console.log("[SharedMcpContext] MCP client disconnected.");
  }, []);

  const connectMcpServer = useCallback(async (config: ServerConfig): Promise<boolean> => {
    if (!config) {
        toast.error("No server configuration selected.");
        return false;
    }
    if (clientRef.current) {
       await disconnectMcpServer();
    }

    setConnectionStatus("connecting");
    setRequestHistory([]);
    setFetchedMcpTools([]);
    setSelectedServerName(config.name);

    console.log(`[SharedMcpContext] Attempting to connect DIRECTLY to proxy for ${config.name}...`);

    try {
      const client = new Client<Request, Notification, Result>(
        { name: "mcp-chat-client", version: PACKAGE_VERSION },
        { capabilities: { /* Define client capabilities */ } }
      );

      // --- Construct URL for the ACTUAL external proxy server ---
      const targetProxySseUrl = new URL(`${process.env.NEXT_PUBLIC_PROXY_SERVER_URL}/sse`);
      targetProxySseUrl.searchParams.append("transportType", config.transport);

      if (config.transport === "stdio") {
        targetProxySseUrl.searchParams.append("command", config.command);
        if (config.args) targetProxySseUrl.searchParams.append("args", config.args.join(' '));
        if (config.env) targetProxySseUrl.searchParams.append("env", JSON.stringify(config.env));
      } else { // sse
        targetProxySseUrl.searchParams.append("url", config.url);
        // Headers for the target SSE are often passed via query or handled by proxy server based on initial connect headers
      }

      // Headers for establishing the SSE connection with the ACTUAL proxy
      const eventSourceHeaders: HeadersInit = { 'Accept': 'text/event-stream' };
       // Add auth headers IF the actual proxy server requires them
       // if (bearerToken) eventSourceHeaders['Authorization'] = `Bearer ${bearerToken}`;

      // Headers for the POST requests made via transport.send() to the ACTUAL proxy
       const postMessageHeaders: HeadersInit = { 'Content-Type': 'application/json' };
       // if (bearerToken) postMessageHeaders['Authorization'] = `Bearer ${bearerToken}`;

      console.log(`[SharedMcpContext] Initializing SSEClientTransport with ACTUAL Proxy URL: ${targetProxySseUrl.toString()}`);

      // Connect transport DIRECTLY to the actual proxy server URL
      const clientTransport = new SSEClientTransport(targetProxySseUrl, {
        eventSourceInit: {  },
        requestInit: { headers: postMessageHeaders }
      });

      // --- Setup Handlers (same as before) ---
       client.setNotificationHandler(StdErrNotificationSchema, (notification) => {
          console.error("MCP Server stderr:", notification.params.content);
       });
       client.fallbackNotificationHandler = (notification: Notification): Promise<void> => {
           console.log("MCP Notification:", notification);
           return Promise.resolve();
       };
       // Add other specific notification handlers if needed

      // Connect the client to the transport
      await client.connect(clientTransport);
      console.log(`[SharedMcpContext] Connected successfully to ${config.name}`);

      const capabilities = client.getServerCapabilities();
      setServerCapabilities(capabilities ?? null);
      setCompletionsSupported(!!capabilities?.completion);
      setMcpClient(client); // Set the older SDK client
      setConnectionStatus("connected");

      // Fetch tools
      try {
        const toolsResponse = await client.request({ method: "tools/list" }, ListToolsResultSchema);
        setFetchedMcpTools(toolsResponse.tools);
        console.log(`[SharedMcpContext] Fetched ${toolsResponse.tools.length} tools from ${config.name}`);
      } catch (toolError) {
          console.error(`[SharedMcpContext] Failed to fetch tools from ${config.name}:`, toolError);
          toast.error(`Failed to fetch tools: ${toolError instanceof Error ? toolError.message : String(toolError)}`);
          setFetchedMcpTools([]);
      }

      return true;

    } catch (error) {
      console.error(`[SharedMcpContext] Failed to connect to MCP server ${config.name}:`, error);
      setConnectionStatus("error");
      // Reset state on error
      setServerCapabilities(null);
      setMcpClient(null);
      clientRef.current = null;
      setFetchedMcpTools([]);
      setSelectedServerName(null); // Clear selection on error
      toast.error(`Connection failed: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }, [disconnectMcpServer]); // Dependency on disconnect


   const makeRequest = useCallback(async <T extends z.ZodType>(
      request: ClientRequest,
      schema: T,
      options?: RequestOptions,
    ): Promise<z.output<T>> => {
      const currentClient = clientRef.current;
      if (!currentClient || connectionStatus !== 'connected') {
        throw new Error("MCP client not connected");
      }

      const effectiveTimeout = options?.timeout ?? requestTimeout;
      let timeoutId: NodeJS.Timeout | undefined;
      const abortController = new AbortController();
      const signal = options?.signal ?? abortController.signal;

       if (options?.signal) {
         options.signal.addEventListener('abort', () => abortController.abort());
       }

      if (effectiveTimeout && effectiveTimeout !== Infinity) {
          timeoutId = setTimeout(() => {
              abortController.abort(`Request timed out after ${effectiveTimeout}ms`);
          }, effectiveTimeout);
      }

      try {
        console.log("[SharedMcpContext] MCP Request:", JSON.stringify(request));
        pushHistory(request);
        const response = await currentClient.request(request, schema, { signal });
        pushHistory(request, response);
        console.log("[SharedMcpContext] MCP Response:", JSON.stringify(response));
        return response;
      } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error("[SharedMcpContext] MCP Request Error:", errorMessage, "Request:", JSON.stringify(request));
          pushHistory(request, { error: errorMessage });
          if (!options?.suppressToast) {
              toast.error(`MCP Request Failed: ${errorMessage}`);
          }
          throw error;
      } finally {
          if (timeoutId) clearTimeout(timeoutId);
      }
    }, [connectionStatus, pushHistory, requestTimeout]); // Add dependencies


    const sendNotification = useCallback(async (notification: ClientNotification) => {
      const currentClient = clientRef.current;
      if (!currentClient || connectionStatus !== 'connected') {
          console.error("[SharedMcpContext] Cannot send notification: MCP client not connected");
          return;
      }
      try {
          await currentClient.notification(notification);
          pushHistory(notification);
      } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          console.error("[SharedMcpContext] MCP Notification Error:", errorMessage, "Notification:", JSON.stringify(notification));
          pushHistory(notification, { error: errorMessage });
          toast.error(`MCP Notification Failed: ${errorMessage}`);
      }
    }, [connectionStatus, pushHistory]); // Add dependencies


    // Kept for potential Inspector UI use
    const handleCompletion = useCallback(async (
      ref: ResourceReference | PromptReference,
      argName: string,
      value: string,
      signal?: AbortSignal
    ): Promise<string[]> => {
       if (!clientRef.current || !completionsSupported) return [];
       try {
         const response = await makeRequest({
              method: "completion/complete",
              params: { argument: { name: argName, value }, ref }
           }, CompleteResultSchema, { signal, suppressToast: true });
         return response?.completion.values || [];
       } catch (e) {
         if (e instanceof McpError && e.code === ErrorCode.MethodNotFound) {
            setCompletionsSupported(false);
            return [];
         }
         console.error("Completion request failed:", e);
         return [];
       }
    }, [completionsSupported, makeRequest]);


  const contextValue: SharedMcpContextType = {
    connectionStatus,
    serverCapabilities,
    mcpClient,
    fetchedMcpTools,
    selectedServerName,
    setSelectedServerName,
    connectMcpServer,
    disconnectMcpServer,
    makeRequest,
    sendNotification,
    requestHistory,
    completionsSupported,
    handleCompletion,
  };

  return (
    <SharedMcpContext.Provider value={contextValue}>
      {children}
    </SharedMcpContext.Provider>
  );
}

export function useSharedMcp() {
  const context = useContext(SharedMcpContext);
  if (context === undefined) {
    throw new Error('useSharedMcp must be used within a SharedMcpProvider');
  }
  return context;
}