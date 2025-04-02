// src/hooks/use-mcp-connection-manager.ts
"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react"; // Import useMemo
import {
  ConnectionState,
  ConnectionStatus,
  MCPRequestRecord,
  MCPNotificationRecord,
  StderrRecord,
  ProxyWebSocketIncoming,
  ProxyWebSocketOutgoing,
} from "@/lib/mcp/types";
import type { ServerConfig } from "@/lib/mcp/config";
import type { ServerCapabilities } from "@modelcontextprotocol/sdk/types.js"; // Import type
import { toast } from "sonner";
import { SpanStatusCode, trace } from "@opentelemetry/api"; // Assuming OTel is still desired

const PROXY_URL = process.env.NEXT_PUBLIC_MCP_PROXY_URL ||
  "ws://localhost:3011/mcp-proxy";
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Helper (can be removed if OTel is fully removed)
const getTracer = () => trace.getTracer("mcp-connection-manager")

// --- Interface defining the public API of the manager ---
export interface MCPConnectionManager {
  // State Accessors (More stable references where possible)
  getConnectionState: (serverName: string) => ConnectionState | undefined; // For detailed access
  getConnectionStatus: (serverName: string) => ConnectionStatus | undefined;
  getCapabilities: (serverName: string) => ServerCapabilities | null | undefined;
  getConnectedServerNames: () => string[]; // Returns memoized array of names

  // Actions
  connect: (serverName: string, config: ServerConfig) => Promise<void>;
  disconnect: (serverName: string) => void;
  makeRequest: <TResult = any>(
    serverName: string,
    request: any, // Should be MCPRequest but using any for flexibility
    timeout?: number,
  ) => Promise<TResult>;
  sendNotification: (
    serverName: string,
    notification: any, // Should be MCPNotification
  ) => void;
  clearHistory: (serverName: string) => void;
}

export function useMCPConnectionManager(): MCPConnectionManager {
  const [connections, setConnections] = useState<Map<string, ConnectionState>>(new Map());
  const wsRefs = useRef<Map<string, WebSocket>>(new Map());
  const requestCounter = useRef<number>(0);

  // --- State Update Logic ---
  const updateConnectionState = useCallback(
    (serverName: string, updater: (prevState: ConnectionState | undefined) => ConnectionState) => {
      setConnections((prevMap) => {
        const initialState = prevMap.get(serverName) ?? initializeConnectionState(serverName);
        const newState = updater(initialState);
        // Optimization: Only create new map if state actually changed
        if (prevMap.get(serverName) === newState) {
          return prevMap;
        }
        const newMap = new Map(prevMap);
        newMap.set(serverName, newState);
        return newMap;
      });
    },
    [], // No dependencies, function reference is stable
  );

  const initializeConnectionState = useCallback((serverName: string): ConnectionState => ({
    serverName,
    status: "disconnected",
    capabilities: null,
    history: [],
    notifications: [],
    stderr: [],
    webSocket: null,
    pendingRequests: new Map(),
  }), []); // No dependencies, function reference is stable

  // --- Actions ---
  const connect = useCallback(async (serverName: string, config: ServerConfig) => {
    const tracer = getTracer();
    const span = tracer.startSpan(`mcp.connect.${serverName}`);
    span.setAttributes({ /* ... OTel attributes ... */ });
    console.log(`[Manager] connect called for: ${serverName}`);

    if (wsRefs.current.has(serverName)) {
      console.warn(`[Manager] WebSocket connection already exists for ${serverName}. Disconnecting first.`);
      wsRefs.current.get(serverName)?.close(1000, "Initiating new connection");
    }

    updateConnectionState(serverName, (prevState) => ({
      ...(prevState ?? initializeConnectionState(serverName)),
      status: "connecting", error: undefined, capabilities: null,
    }));
    console.log(`[Manager] State set to 'connecting' for ${serverName}`);

    try {
      const ws = new WebSocket(PROXY_URL);
      wsRefs.current.set(serverName, ws);
      ws.binaryType = 'arraybuffer';

      // Update state immediately with the WebSocket instance
      updateConnectionState(serverName, (prevState) => ({ ...prevState!, webSocket: ws }));

      ws.onopen = () => {
        span.addEvent("WebSocket opened");
        console.log(`[Manager] WebSocket opened for ${serverName}. Sending connect msg.`);
        const connectMsg: ProxyWebSocketOutgoing = { type: "connect", config };
        try {
          ws.send(JSON.stringify(connectMsg));
          console.log(`[Manager] Sent connect message for ${serverName}`);
          span.addEvent("Sent connect message to proxy");
        } catch (sendError) {
          console.error(`[Manager] Error sending connect message for ${serverName}:`, sendError);
          // Handle immediate send error if needed (e.g., update state to error)
          updateConnectionState(serverName, (prev) => ({...prev!, status: 'error', error: `WS Send Error: ${sendError instanceof Error ? sendError.message : String(sendError)}`}));
          ws.close(1011, "Failed to send connect message");
        }
      };

      ws.onmessage = (event) => {
        const messageTracer = getTracer(); // OTel: Get tracer within handler
        const messageSpan = messageTracer.startSpan(`mcp.ws.onmessage.${serverName}`); // OTel: Start span
        console.log(`[Manager] WS Message received for ${serverName}:`, typeof event.data === 'string' ? event.data : `ArrayBuffer (${event.data instanceof ArrayBuffer ? event.data.byteLength : 'N/A'} bytes)`);
        try {
          let parsedData: ProxyWebSocketIncoming;

          // Handle string messages (status, stderr)
          if (typeof event.data === "string") {
            parsedData = JSON.parse(event.data);
            messageSpan.setAttribute("message.type", "string");
          }
          // Handle binary messages (MCP payloads)
          else if (event.data instanceof ArrayBuffer) {
            const mcpPayloadString = new TextDecoder().decode(event.data);
            const mcpPayload = JSON.parse(mcpPayloadString);
            parsedData = { type: "mcp", payload: mcpPayload };
            messageSpan.setAttribute("message.type", "binary");
          } else {
            throw new Error("Unsupported WebSocket message data type received");
          }
          messageSpan.setAttribute("proxy.message.type", parsedData.type);

          if (parsedData.type === "status") {
            console.log(`[Manager] Updating status for ${serverName} to: ${parsedData.status}`);
            messageSpan.addEvent(`Received status update: ${parsedData.status}`);
            updateConnectionState(serverName, (prevState) => ({
              ...prevState!,
              status: parsedData.status,
              error: parsedData.status === "error" ? parsedData.message : undefined, // Clear error if not error status
              capabilities: parsedData.status === "connected" ? (parsedData.capabilities ?? null) : null, // Store capabilities or null
            }));
            if (parsedData.status === "error") {
              toast.error(`Connection Error (${serverName}): ${parsedData.message}`);
              messageSpan.setStatus({ code: SpanStatusCode.ERROR, message: parsedData.message });
            } else if (parsedData.status === "connected") {
              toast.success(`Connected to ${serverName}`);
              messageSpan.setStatus({ code: SpanStatusCode.OK });
            }
          } else if (parsedData.type === "mcp") {
            const payload = parsedData.payload as any; // Cast for checking properties
            messageSpan.setAttribute("mcp.message.id", payload?.id ?? "notification");
            messageSpan.setAttribute("mcp.message.method", payload?.method ?? (payload?.result ? "response" : "error"));

            if (payload && typeof payload === 'object' && ('id' in payload)) { // Response or Error
              updateConnectionState(serverName, (prevState) => {
                if (!prevState) return initializeConnectionState(serverName);
                const pending = prevState.pendingRequests.get(payload.id);
                const reqIndex = prevState.history.findIndex(h => h.id === payload.id && !h.responseTimestamp);
                let historyUpdate = {};

                if (pending) {
                  console.log(`[Manager] Resolving/Rejecting pending request ID ${payload.id} for ${serverName}`);
                  if ('error' in payload && payload.error) { // Check if error exists
                    pending.reject(payload.error);
                    messageSpan.setStatus({ code: SpanStatusCode.ERROR, message: payload.error.message });
                  } else {
                    pending.resolve(payload.result); // Assumes result exists if no error
                    messageSpan.setStatus({ code: SpanStatusCode.OK });
                  }
                  prevState.pendingRequests.delete(payload.id); // Mutate map
                } else {
                  console.warn(`[Manager] Received response for unknown/timed out request ID ${payload.id} for ${serverName}`);
                }

                if (reqIndex !== -1) {
                  const newHistory = [...prevState.history];
                  newHistory[reqIndex] = {
                    ...newHistory[reqIndex],
                    response: payload,
                    responseTimestamp: Date.now(),
                  };
                  historyUpdate = { history: newHistory };
                }

                // Return new state object - MUST return a new object if pendingRequests was mutated
                return { ...prevState, ...historyUpdate, pendingRequests: new Map(prevState.pendingRequests) };
              });
            } else if (payload && typeof payload === 'object' && ('method' in payload)) { // Notification
              console.log(`[Manager] Adding notification ${payload.method} for ${serverName}`);
              messageSpan.addEvent("Received MCP notification");
              updateConnectionState(serverName, (prevState) => ({
                ...prevState!,
                notifications: [
                  ...(prevState?.notifications ?? []), // Handle potentially undefined prevState
                  { notification: payload, timestamp: Date.now() },
                ],
              }));
            } else {
              console.warn(`[Manager] Received unhandled MCP payload structure for ${serverName}:`, payload);
              messageSpan.addEvent("Unhandled MCP payload");
            }
          } else if (parsedData.type === "stderr") {
            console.log(`[Manager] Adding stderr for ${serverName}:`, parsedData.content.substring(0, 100));
            messageSpan.addEvent("Received stderr output");
            updateConnectionState(serverName, (prevState) => ({
              ...prevState!,
              stderr: [
                ...(prevState?.stderr ?? []), // Handle potentially undefined prevState
                { content: parsedData.content, timestamp: Date.now() },
              ],
            }));
          } else {
            console.warn(`[Manager] Received unknown message type from proxy for ${serverName}: ${(parsedData as any).type}`);
            messageSpan.addEvent("Unknown message type");
          }
        } catch (error: unknown) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[Manager] Error processing WebSocket message for ${serverName}: ${errorMsg}`);
          messageSpan.recordException(error instanceof Error ? error : new Error(errorMsg));
          messageSpan.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
        } finally {
          messageSpan.end(); // OTel: End span
        }
      };

      ws.onerror = (event) => {
        const error = event instanceof ErrorEvent ? event.error : new Error("Unknown WebSocket error");
        console.error(`[Manager] WebSocket error for ${serverName}: ${error?.message ?? 'Unknown'}`);
        span.recordException(error ?? new Error("Unknown WebSocket error"));
        span.setStatus({ code: SpanStatusCode.ERROR, message: `WebSocket Error: ${error?.message ?? 'Unknown'}` });
        // onclose will handle state update and span ending
      };

      ws.onclose = (event) => {
        console.log(`[Manager] WebSocket closed for ${serverName}. Code: ${event.code}, Reason: ${event.reason}`);
        span.addEvent("WebSocket closed", { "ws.close.code": event.code, "ws.close.reason": event.reason });
        wsRefs.current.delete(serverName);
        updateConnectionState(serverName, (prevState) => {
          const baseState = prevState ?? initializeConnectionState(serverName);
          const currentStatus = baseState.status;
          // Preserve error status if it was already set, otherwise disconnected
          const newStatus: ConnectionStatus = currentStatus === "error" ? "error" : "disconnected";
          const errorMsg = newStatus === "error" ? baseState.error : (event.code !== 1000 ? `WebSocket closed unexpectedly: ${event.code}` : undefined);

          // Reject any pending requests
          baseState.pendingRequests.forEach(({ reject }) => reject(new Error(`Connection closed (Code: ${event.code})`)));

          span.setStatus({ code: event.code === 1000 ? SpanStatusCode.OK : SpanStatusCode.ERROR, message: `WS Closed: ${event.code}` });
          span.end(); // End the main connect span here

          return {
            ...baseState,
            status: newStatus,
            error: errorMsg,
            webSocket: null,
            pendingRequests: new Map(), // Clear pending requests
          };
        });
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Manager] Failed to establish WebSocket connection for ${serverName}: ${errorMsg}`);
      toast.error(`Failed to connect to ${serverName}: ${errorMsg}`);
      updateConnectionState(serverName, (prevState) => ({
        ...(prevState ?? initializeConnectionState(serverName)),
        status: "error",
        error: errorMsg,
      }));
      span.recordException(error instanceof Error ? error : new Error(errorMsg));
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
      span.end(); // End span on immediate construction error
    }
  }, [updateConnectionState, initializeConnectionState]); // Added initialize to deps

  const disconnect = useCallback((serverName: string) => {
    console.log(`[Manager] disconnect called for: ${serverName}`);
    const tracer = getTracer(); // OTel
    const span = tracer.startSpan(`mcp.disconnect.${serverName}`); // OTel
    span.setAttribute("mcp.server.name", serverName); // OTel

    const ws = wsRefs.current.get(serverName);
    if (ws) {
      console.info(`Disconnecting WebSocket for ${serverName}`);
      ws.close(1000, "User disconnected"); // Normal closure
      wsRefs.current.delete(serverName); // Clean up ref immediately
      span.addEvent("WebSocket close initiated"); // OTel
    } else {
      console.warn(`[Manager] No active WebSocket found for ${serverName} during disconnect.`);
      span.addEvent("No active WebSocket found"); // OTel
    }
    // State update happens in ws.onclose
    span.end(); // OTel
  }, []); // No dependencies needed

  const makeRequest = useCallback(
    async <TResult = any>(
      serverName: string,
      request: any, // Should be MCPRequest
      timeout: number = REQUEST_TIMEOUT,
    ): Promise<TResult> => {
      const tracer = getTracer(); // OTel
      const requestSpan = tracer.startSpan(`mcp.request.${request?.method ?? 'unknown'}`); // OTel
      requestSpan.setAttributes({ /* ... OTel attributes ... */ }); // OTel

      const ws = wsRefs.current.get(serverName);
      const connectionState = connections.get(serverName);

      if (!ws || ws.readyState !== WebSocket.OPEN || connectionState?.status !== "connected") {
        requestSpan.addEvent("Connection not available"); // OTel
        requestSpan.setStatus({ code: SpanStatusCode.ERROR, message: "Connection not available" }); // OTel
        requestSpan.end(); // OTel
        throw new Error(`Not connected to server: ${serverName}`);
      }

      return new Promise<TResult>((resolve, reject) => {
        const requestId = request.id ?? (requestCounter.current += 1);
        const requestWithId = { ...request, jsonrpc: "2.0", id: requestId }; // Ensure jsonrpc and id
        requestSpan.setAttribute("rpc.request.id", String(requestId)); // OTel

        const timeoutId = setTimeout(() => {
          const errorMsg = `Request timed out after ${timeout / 1000}s`;
          updateConnectionState(serverName, prevState => {
            if (!prevState) return initializeConnectionState(serverName);
            prevState.pendingRequests.delete(requestId); // Mutate directly
            const history = prevState.history.map((h) => (h.id === requestId ? { ...h, error: errorMsg, responseTimestamp: Date.now() } : h));
            return { ...prevState, history, pendingRequests: new Map(prevState.pendingRequests) }; // Return new state object
          });
          requestSpan.addEvent(errorMsg); // OTel
          requestSpan.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg }); // OTel
          requestSpan.end(); // OTel
          reject(new Error(errorMsg));
        }, timeout);

        updateConnectionState(serverName, (prevState) => {
          if (!prevState) return initializeConnectionState(serverName); // Should not happen
          const newPending = new Map(prevState.pendingRequests);
          newPending.set(requestId, {
            resolve: (value: any) => {
              clearTimeout(timeoutId);
              requestSpan.setStatus({ code: SpanStatusCode.OK }); // OTel
              requestSpan.end(); // OTel
              resolve(value);
            },
            reject: (reason?: any) => {
              clearTimeout(timeoutId);
              const errorMsg = reason instanceof Error ? reason.message : String(reason ?? "Unknown error");
              requestSpan.recordException(reason instanceof Error ? reason : new Error(errorMsg)); // OTel
              requestSpan.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg }); // OTel
              requestSpan.end(); // OTel
              reject(reason);
            },
          });

          const historyEntry: MCPRequestRecord = {
            id: requestId,
            request: requestWithId,
            timestamp: Date.now(),
          };

          // Send as ArrayBuffer
          try {
            const messageString = JSON.stringify(requestWithId);
            const messageBuffer = new TextEncoder().encode(messageString).buffer;
            ws.send(messageBuffer); // Send binary data
            requestSpan.addEvent("Request sent to proxy"); // OTel
            return {
              ...prevState,
              history: [...prevState.history, historyEntry],
              pendingRequests: newPending,
            };
          } catch (error) {
            clearTimeout(timeoutId); // Clear timeout on immediate send error
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Failed to send request for ${serverName}: ${errorMessage}`);
            requestSpan.recordException(error instanceof Error ? error : new Error(errorMessage)); // OTel
            requestSpan.setStatus({ code: SpanStatusCode.ERROR, message: `Send Error: ${errorMessage}` }); // OTel
            requestSpan.end(); // OTel
            reject(error); // Reject the promise
            // Ensure we don't keep the pending request if send fails
            prevState.pendingRequests.delete(requestId);
            return { ...prevState, pendingRequests: new Map(prevState.pendingRequests) };
          }
        });
      });
    },
    [connections, updateConnectionState, initializeConnectionState], // Added initializeConnectionState dependency
  );

  const sendNotification = useCallback(
    (serverName: string, notification: any /* MCPNotification */) => {
      const tracer = getTracer(); // OTel
      const span = tracer.startSpan(`mcp.notification.${notification?.method ?? 'unknown'}`); // OTel
      span.setAttributes({ /* ... OTel attributes ... */ }); // OTel

      const ws = wsRefs.current.get(serverName);
      const connectionState = connections.get(serverName);

      if (!ws || ws.readyState !== WebSocket.OPEN || connectionState?.status !== "connected") {
        console.warn(`Cannot send notification to ${serverName}: Not connected.`);
        span.addEvent("Connection not available"); // OTel
        span.setStatus({ code: SpanStatusCode.ERROR, message: "Connection not available" }); // OTel
        span.end(); // OTel
        return;
      }

      try {
        const notificationWithRpc = { ...notification, jsonrpc: "2.0" };
        const messageString = JSON.stringify(notificationWithRpc);
        const messageBuffer = new TextEncoder().encode(messageString).buffer;
        ws.send(messageBuffer); // Send binary data
        span.addEvent("Notification sent to proxy"); // OTel
        updateConnectionState(serverName, (prevState) => ({
          ...(prevState ?? initializeConnectionState(serverName)),
          history: [
            ...(prevState?.history ?? []),
            { id: `notif-${Date.now()}`, request: notificationWithRpc, timestamp: Date.now() },
          ],
        }));
        span.setStatus({ code: SpanStatusCode.OK }); // OTel
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to send notification for ${serverName}: ${errorMessage}`);
        span.recordException(error instanceof Error ? error : new Error(errorMessage)); // OTel
        span.setStatus({ code: SpanStatusCode.ERROR, message: `Send Error: ${errorMessage}` }); // OTel
      } finally {
        span.end(); // OTel
      }
    },
    [connections, updateConnectionState, initializeConnectionState], // Added initializeConnectionState dependency
  );

  // --- Selectors (Memoized for stability) ---
  const getConnectionState = useCallback(
    (serverName: string): ConnectionState | undefined => {
      return connections.get(serverName);
    },
    [connections]
  );

  const getConnectionStatus = useCallback(
    (serverName: string): ConnectionStatus | undefined => {
      return connections.get(serverName)?.status;
    },
    [connections]
  );

  const getCapabilities = useCallback(
    (serverName: string): ServerCapabilities | null | undefined => {
        return connections.get(serverName)?.capabilities;
    },
    [connections]
  );

  const connectedServerNames = useMemo(() => {
      console.log("[Manager] Recalculating connectedServerNames");
      return Array.from(connections.entries())
          .filter(([, state]) => state.status === 'connected')
          .map(([name]) => name);
  }, [connections]);

  const getConnectedServerNames = useCallback(() => {
      return connectedServerNames;
  }, [connectedServerNames]);

  const clearHistory = useCallback(
    (serverName: string) => {
      updateConnectionState(serverName, (prevState) => {
        if (!prevState) return initializeConnectionState(serverName);
        return {
          ...prevState,
          history: [],
          notifications: [],
          stderr: [],
        };
      });
    },
    [updateConnectionState, initializeConnectionState] // Added initializeConnectionState dependency
  );

  // Cleanup effect
  useEffect(() => {
    return () => {
      wsRefs.current.forEach((ws, name) => {
        console.info(`[Manager] Cleaning up WebSocket for ${name} on unmount.`);
        ws.close(1000, "Component unmounted");
      });
      wsRefs.current.clear();
    };
  }, []);

  // Return the public API including selectors
  return useMemo(() => ({
    connections, // Provide direct access if needed by some components
    connect,
    disconnect,
    makeRequest,
    sendNotification,
    getConnectionState,
    getConnectionStatus,
    getCapabilities,
    getConnectedServerNames,
    clearHistory,
  }), [ // Ensure all returned functions/values are listed as dependencies
    connections,
    connect,
    disconnect,
    makeRequest,
    sendNotification,
    getConnectionState,
    getConnectionStatus,
    getCapabilities,
    getConnectedServerNames,
    clearHistory
  ]);
}