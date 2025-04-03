// src/hooks/use-mcp-connection-manager.ts
"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  ConnectionState,
  ConnectionStatus,
  MCPRequestRecord,
  MCPNotificationRecord,
  StderrRecord,
} from "@/lib/mcp/types";
import type { ServerConfig } from "@/lib/mcp/config";
import type { ServerCapabilities } from "@modelcontextprotocol/sdk/types.js";
import { toast } from "sonner";
import { SpanStatusCode, trace } from "@opentelemetry/api";

const REQUEST_TIMEOUT = 30000; // 30 seconds

// Helper (can be removed if OTel is fully removed)
const getTracer = () => trace.getTracer("mcp-connection-manager");

// --- Interface defining the public API of the manager ---
export interface MCPConnectionManager {
  // State Accessors (More stable references where possible)
  getConnectionState: (serverName: string) => ConnectionState | undefined;
  getConnectionStatus: (serverName: string) => ConnectionStatus | undefined;
  getCapabilities: (serverName: string) => ServerCapabilities | null | undefined;
  getConnectedServerNames: () => string[];

  // Actions
  connect: (serverName: string, config: ServerConfig) => Promise<void>;
  disconnect: (serverName: string) => void;
  makeRequest: <TResult = any>(
    serverName: string,
    request: any,
    timeout?: number,
  ) => Promise<TResult>;
  sendNotification: (
    serverName: string,
    notification: any,
  ) => void;
  clearHistory: (serverName: string) => void;
}

// Define connection handlers for different transport types
interface ConnectionHandler {
  connect: (serverName: string, config: ServerConfig) => Promise<void>;
  disconnect: (serverName: string) => void;
  sendRequest: <T>(serverName: string, request: any) => Promise<T>;
  sendNotification: (serverName: string, notification: any) => void;
}

export function useMCPConnectionManager(): MCPConnectionManager {
  const [connections, setConnections] = useState<Map<string, ConnectionState>>(new Map());
  const connectionHandlers = useRef<Map<string, ConnectionHandler>>(new Map());
  const requestCounter = useRef<number>(0);
  const pendingRequests = useRef<Map<string, Map<number, { resolve: Function; reject: Function; timeoutId: NodeJS.Timeout }>>>(new Map());

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
    [],
  );

  const initializeConnectionState = useCallback((serverName: string): ConnectionState => ({
    serverName,
    status: "disconnected",
    capabilities: null,
    history: [],
    notifications: [],
    stderr: [],
    pendingRequests: new Map(),
  }), []);

  // --- Connection handlers by transport type ---
  const createStdioHandler = useCallback((config: ServerConfig): ConnectionHandler => {
    // This would be implemented with Node.js child_process in a server component
    // For client-side, we'll need to communicate with a server endpoint that manages stdio processes
    return {
      connect: async (serverName, config) => {
        const tracer = getTracer();
        const span = tracer.startSpan(`mcp.connect.stdio.${serverName}`);
        
        updateConnectionState(serverName, (prev) => ({
          ...prev!,
          status: "connecting",
        }));

        // Here you'd make a fetch request to your API endpoint to start the process
        try {
          // Simulate API call to start process
          await new Promise(resolve => setTimeout(resolve, 500));
          
          updateConnectionState(serverName, (prev) => ({
            ...prev!,
            status: "connected",
            capabilities: {}, // This would come from the process
          }));
          
          toast.success(`Connected to ${serverName}`);
          span.setStatus({ code: SpanStatusCode.OK });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          updateConnectionState(serverName, (prev) => ({
            ...prev!,
            status: "error",
            error: errorMsg,
          }));
          
          toast.error(`Failed to connect to ${serverName}: ${errorMsg}`);
          span.recordException(error instanceof Error ? error : new Error(errorMsg));
          span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
        } finally {
          span.end();
        }
      },
      
      disconnect: (serverName) => {
        const tracer = getTracer();
        const span = tracer.startSpan(`mcp.disconnect.stdio.${serverName}`);
        
        // Make API call to terminate process
        try {
          // Simulate API call
          
          // Clean up resources
          connectionHandlers.current.delete(serverName);
          
          // Update state
          updateConnectionState(serverName, (prev) => ({
            ...prev!,
            status: "disconnected",
          }));
          
          span.setStatus({ code: SpanStatusCode.OK });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`Error disconnecting ${serverName}: ${errorMsg}`);
          span.recordException(error instanceof Error ? error : new Error(errorMsg));
          span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
        } finally {
          span.end();
        }
      },
      
      sendRequest: async <T>(serverName: string, request: any): Promise<T> => {
        const tracer = getTracer();
        const requestSpan = tracer.startSpan(`mcp.request.stdio.${request?.method ?? 'unknown'}`);
        
        try {
          // Make API call to send request to stdio process
          // Simulate API response
          await new Promise(resolve => setTimeout(resolve, 300));
          const result = { success: true } as T;
          
          requestSpan.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          requestSpan.recordException(error instanceof Error ? error : new Error(errorMsg));
          requestSpan.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
          throw error;
        } finally {
          requestSpan.end();
        }
      },
      
      sendNotification: (serverName: string, notification: any) => {
        const tracer = getTracer();
        const span = tracer.startSpan(`mcp.notification.stdio.${notification?.method ?? 'unknown'}`);
        
        try {
          // Make API call to send notification to stdio process
          
          span.setStatus({ code: SpanStatusCode.OK });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          span.recordException(error instanceof Error ? error : new Error(errorMsg));
          span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
        } finally {
          span.end();
        }
      }
    };
  }, [updateConnectionState]);

  const createSseHandler = useCallback((config: ServerConfig): ConnectionHandler => {
    let eventSource: EventSource | null = null;
    
    return {
      connect: async (serverName, config) => {
        const tracer = getTracer();
        const span = tracer.startSpan(`mcp.connect.sse.${serverName}`);
        
        if (!('url' in config)) {
          const errorMsg = "SSE configuration missing URL";
          updateConnectionState(serverName, (prev) => ({
            ...prev!,
            status: "error",
            error: errorMsg,
          }));
          span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
          span.end();
          return;
        }
        
        updateConnectionState(serverName, (prev) => ({
          ...prev!,
          status: "connecting",
        }));
        
        try {
          // Create EventSource
          eventSource = new EventSource(config.url);
          
          eventSource.onopen = () => {
            updateConnectionState(serverName, (prev) => ({
              ...prev!,
              status: "connected",
              capabilities: {}, // This would come from initial SSE message
            }));
            
            toast.success(`Connected to ${serverName}`);
            span.setStatus({ code: SpanStatusCode.OK });
            span.end();
          };
          
          eventSource.onerror = (error) => {
            const errorMsg = "SSE connection error";
            updateConnectionState(serverName, (prev) => ({
              ...prev!,
              status: "error",
              error: errorMsg,
            }));
            
            toast.error(`Connection Error (${serverName}): ${errorMsg}`);
            span.recordException(new Error(errorMsg));
            span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
            span.end();
            
            // Clean up
            eventSource?.close();
            eventSource = null;
          };
          
          // Set up message handling
          eventSource.onmessage = (event) => {
            const messageTracer = getTracer();
            const messageSpan = messageTracer.startSpan(`mcp.sse.onmessage.${serverName}`);
            
            try {
              const data = JSON.parse(event.data);
              
              // Handle data based on its type
              if (data.id) {
                // It's a response to a request
                const pendingServerRequests = pendingRequests.current.get(serverName);
                const pending = pendingServerRequests?.get(data.id);
                
                if (pending) {
                  clearTimeout(pending.timeoutId);
                  if (data.error) {
                    pending.reject(data.error);
                    messageSpan.setStatus({ code: SpanStatusCode.ERROR, message: data.error.message });
                  } else {
                    pending.resolve(data.result);
                    messageSpan.setStatus({ code: SpanStatusCode.OK });
                  }
                  
                  pendingServerRequests?.delete(data.id);
                  
                  // Update history
                  updateConnectionState(serverName, (prevState) => {
                    if (!prevState) return initializeConnectionState(serverName);
                    
                    const reqIndex = prevState.history.findIndex(h => h.id === data.id && !h.responseTimestamp);
                    if (reqIndex !== -1) {
                      const newHistory = [...prevState.history];
                      newHistory[reqIndex] = {
                        ...newHistory[reqIndex],
                        response: data,
                        responseTimestamp: Date.now(),
                      };
                      
                      return { ...prevState, history: newHistory };
                    }
                    
                    return prevState;
                  });
                }
              } else if (data.method) {
                // It's a notification
                updateConnectionState(serverName, (prevState) => ({
                  ...prevState!,
                  notifications: [
                    ...(prevState?.notifications ?? []),
                    { notification: data, timestamp: Date.now() },
                  ],
                }));
                
                messageSpan.addEvent("Received MCP notification");
              }
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              console.error(`Error processing SSE message for ${serverName}: ${errorMsg}`);
              messageSpan.recordException(error instanceof Error ? error : new Error(errorMsg));
              messageSpan.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
            } finally {
              messageSpan.end();
            }
          };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          updateConnectionState(serverName, (prev) => ({
            ...prev!,
            status: "error",
            error: errorMsg,
          }));
          
          toast.error(`Failed to connect to ${serverName}: ${errorMsg}`);
          span.recordException(error instanceof Error ? error : new Error(errorMsg));
          span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
          span.end();
        }
      },
      
      disconnect: (serverName) => {
        const tracer = getTracer();
        const span = tracer.startSpan(`mcp.disconnect.sse.${serverName}`);
        
        try {
          // Close EventSource
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          
          // Clean up resources
          connectionHandlers.current.delete(serverName);
          
          // Update state
          updateConnectionState(serverName, (prev) => ({
            ...prev!,
            status: "disconnected",
          }));
          
          span.setStatus({ code: SpanStatusCode.OK });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`Error disconnecting ${serverName}: ${errorMsg}`);
          span.recordException(error instanceof Error ? error : new Error(errorMsg));
          span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
        } finally {
          span.end();
        }
      },
      
      sendRequest: async <T>(serverName: string, request: any): Promise<T> => {
        const tracer = getTracer();
        const requestSpan = tracer.startSpan(`mcp.request.sse.${request?.method ?? 'unknown'}`);
        
        const connectionState = connections.get(serverName);
        
        if (!connectionState || connectionState.status !== "connected") {
          const errorMsg = `Not connected to server: ${serverName}`;
          requestSpan.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
          requestSpan.end();
          throw new Error(errorMsg);
        }
        
        // For SSE we need to make a separate HTTP request since SSE is one-way communication
        try {
          // Make HTTP POST to the corresponding endpoint
          const sseConfig = config as { url: string; headers?: Record<string, string> };
          const baseUrl = new URL(sseConfig.url);
          const requestUrl = new URL('/request', baseUrl); // This would be your endpoint for making requests
          
          // Simulate HTTP request
          await new Promise(resolve => setTimeout(resolve, 300));
          const result = { success: true } as T;
          
          requestSpan.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          requestSpan.recordException(error instanceof Error ? error : new Error(errorMsg));
          requestSpan.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
          throw error;
        } finally {
          requestSpan.end();
        }
      },
      
      sendNotification: (serverName: string, notification: any) => {
        const tracer = getTracer();
        const span = tracer.startSpan(`mcp.notification.sse.${notification?.method ?? 'unknown'}`);
        
        const connectionState = connections.get(serverName);
        
        if (!connectionState || connectionState.status !== "connected") {
          span.setStatus({ code: SpanStatusCode.ERROR, message: "Not connected" });
          span.end();
          return;
        }
        
        try {
          // Make HTTP POST to send notification
          const sseConfig = config as { url: string; headers?: Record<string, string> };
          const baseUrl = new URL(sseConfig.url);
          const notificationUrl = new URL('/notification', baseUrl);
          
          // Simulate sending notification
          
          // Update history
          updateConnectionState(serverName, (prevState) => ({
            ...(prevState ?? initializeConnectionState(serverName)),
            history: [
              ...(prevState?.history ?? []),
              { id: `notif-${Date.now()}`, request: notification, timestamp: Date.now() },
            ],
          }));
          
          span.setStatus({ code: SpanStatusCode.OK });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          span.recordException(error instanceof Error ? error : new Error(errorMsg));
          span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
        } finally {
          span.end();
        }
      }
    };
  }, [connections, updateConnectionState, initializeConnectionState]);

  // --- Main API functions ---
  const connect = useCallback(async (serverName: string, config: ServerConfig) => {
    const tracer = getTracer();
    const span = tracer.startSpan(`mcp.connect.${serverName}`);
    console.log(`[Manager] connect called for: ${serverName}`);

    try {
      let handler: ConnectionHandler;
      
      if (config.transport === "stdio") {
        handler = createStdioHandler(config);
      } else if (config.transport === "sse") {
        handler = createSseHandler(config);
      } else {
        throw new Error(`Unsupported transport type: ${config}`);
      }
      
      connectionHandlers.current.set(serverName, handler);
      
      // Initialize pending requests map for this server
      if (!pendingRequests.current.has(serverName)) {
        pendingRequests.current.set(serverName, new Map());
      }
      
      // Call the handler's connect method
      await handler.connect(serverName, config);
      
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Manager] Failed to connect to ${serverName}: ${errorMsg}`);
      toast.error(`Failed to connect to ${serverName}: ${errorMsg}`);
      
      updateConnectionState(serverName, (prevState) => ({
        ...(prevState ?? initializeConnectionState(serverName)),
        status: "error",
        error: errorMsg,
      }));
      
      span.recordException(error instanceof Error ? error : new Error(errorMsg));
      span.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
    } finally {
      span.end();
    }
  }, [createStdioHandler, createSseHandler, updateConnectionState, initializeConnectionState]);

  const disconnect = useCallback((serverName: string) => {
    console.log(`[Manager] disconnect called for: ${serverName}`);
    const tracer = getTracer();
    const span = tracer.startSpan(`mcp.disconnect.${serverName}`);
    span.setAttribute("mcp.server.name", serverName);

    const handler = connectionHandlers.current.get(serverName);
    
    if (handler) {
      console.info(`Disconnecting ${serverName}`);
      handler.disconnect(serverName);
      span.addEvent("Disconnect initiated");
    } else {
      console.warn(`[Manager] No active connection handler found for ${serverName} during disconnect.`);
      span.addEvent("No active connection handler found");
      
      // Update state anyway
      updateConnectionState(serverName, (prevState) => ({
        ...(prevState ?? initializeConnectionState(serverName)),
        status: "disconnected",
      }));
    }
    
    // Clean up pending requests
    const serverPendingRequests = pendingRequests.current.get(serverName);
    if (serverPendingRequests) {
      serverPendingRequests.forEach(({ reject, timeoutId }) => {
        clearTimeout(timeoutId);
        reject(new Error(`Connection to ${serverName} closed`));
      });
      serverPendingRequests.clear();
    }
    
    span.end();
  }, [updateConnectionState, initializeConnectionState]);

  const makeRequest = useCallback(
    async <TResult = any>(
      serverName: string,
      request: any,
      timeout: number = REQUEST_TIMEOUT,
    ): Promise<TResult> => {
      const tracer = getTracer();
      const requestSpan = tracer.startSpan(`mcp.request.${request?.method ?? 'unknown'}`);
      requestSpan.setAttributes({});

      const connectionState = connections.get(serverName);
      const handler = connectionHandlers.current.get(serverName);

      if (!handler || !connectionState || connectionState.status !== "connected") {
        requestSpan.addEvent("Connection not available");
        requestSpan.setStatus({ code: SpanStatusCode.ERROR, message: "Connection not available" });
        requestSpan.end();
        throw new Error(`Not connected to server: ${serverName}`);
      }

      return new Promise<TResult>((resolve, reject) => {
        const requestId = request.id ?? (requestCounter.current += 1);
        const requestWithId = { ...request, jsonrpc: "2.0", id: requestId };
        requestSpan.setAttribute("rpc.request.id", String(requestId));

        // Set up timeout
        const timeoutId = setTimeout(() => {
          const errorMsg = `Request timed out after ${timeout / 1000}s`;
          
          // Clean up pending request
          const serverPendingRequests = pendingRequests.current.get(serverName);
          serverPendingRequests?.delete(requestId);
          
          // Update history
          updateConnectionState(serverName, prevState => {
            if (!prevState) return initializeConnectionState(serverName);
            
            const history = prevState.history.map((h) => 
              (h.id === requestId ? { ...h, error: errorMsg, responseTimestamp: Date.now() } : h)
            );
            
            return { ...prevState, history };
          });
          
          requestSpan.addEvent(errorMsg);
          requestSpan.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
          requestSpan.end();
          reject(new Error(errorMsg));
        }, timeout);

        // Store pending request
        const serverPendingRequests = pendingRequests.current.get(serverName);
        if (serverPendingRequests) {
          serverPendingRequests.set(requestId, {
            resolve: (value: any) => {
              clearTimeout(timeoutId);
              requestSpan.setStatus({ code: SpanStatusCode.OK });
              requestSpan.end();
              resolve(value);
            },
            reject: (reason?: any) => {
              clearTimeout(timeoutId);
              const errorMsg = reason instanceof Error ? reason.message : String(reason ?? "Unknown error");
              requestSpan.recordException(reason instanceof Error ? reason : new Error(errorMsg));
              requestSpan.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
              requestSpan.end();
              reject(reason);
            },
            timeoutId,
          });
        }

        // Add to history
        updateConnectionState(serverName, (prevState) => {
          const historyEntry: MCPRequestRecord = {
            id: requestId,
            request: requestWithId,
            timestamp: Date.now(),
          };
          
          return {
            ...(prevState ?? initializeConnectionState(serverName)),
            history: [...(prevState?.history ?? []), historyEntry],
          };
        });

        // Send the request
        handler.sendRequest<TResult>(serverName, requestWithId)
          .then(result => {
            const serverPendingRequests = pendingRequests.current.get(serverName);
            const pending = serverPendingRequests?.get(requestId);
            
            if (pending) {
              clearTimeout(pending.timeoutId);
              serverPendingRequests?.delete(requestId);
              resolve(result);
              
              // Update history
              updateConnectionState(serverName, (prevState) => {
                if (!prevState) return initializeConnectionState(serverName);
                
                const reqIndex = prevState.history.findIndex(h => h.id === requestId && !h.responseTimestamp);
                if (reqIndex !== -1) {
                  const newHistory = [...prevState.history];
                  newHistory[reqIndex] = {
                    ...newHistory[reqIndex],
                    response: { id: requestId, result },
                    responseTimestamp: Date.now(),
                  };
                  
                  return { ...prevState, history: newHistory };
                }
                
                return prevState;
              });
              
              requestSpan.setStatus({ code: SpanStatusCode.OK });
              requestSpan.end();
            }
          })
          .catch(error => {
            const serverPendingRequests = pendingRequests.current.get(serverName);
            const pending = serverPendingRequests?.get(requestId);
            
            if (pending) {
              clearTimeout(pending.timeoutId);
              serverPendingRequests?.delete(requestId);
              reject(error);
              
              // Update history
              updateConnectionState(serverName, (prevState) => {
                if (!prevState) return initializeConnectionState(serverName);
                
                const reqIndex = prevState.history.findIndex(h => h.id === requestId && !h.responseTimestamp);
                if (reqIndex !== -1) {
                  const newHistory = [...prevState.history];
                  newHistory[reqIndex] = {
                    ...newHistory[reqIndex],
                    error: error instanceof Error ? error.message : String(error),
                    responseTimestamp: Date.now(),
                  };
                  
                  return { ...prevState, history: newHistory };
                }
                
                return prevState;
              });
              
              const errorMsg = error instanceof Error ? error.message : String(error);
              requestSpan.recordException(error instanceof Error ? error : new Error(errorMsg));
              requestSpan.setStatus({ code: SpanStatusCode.ERROR, message: errorMsg });
              requestSpan.end();
            }
          });
      });
    },
    [connections, updateConnectionState, initializeConnectionState],
  );

  const sendNotification = useCallback(
    (serverName: string, notification: any) => {
      const tracer = getTracer();
      const span = tracer.startSpan(`mcp.notification.${notification?.method ?? 'unknown'}`);
      span.setAttributes({});

      const connectionState = connections.get(serverName);
      const handler = connectionHandlers.current.get(serverName);

      if (!handler || !connectionState || connectionState.status !== "connected") {
        console.warn(`Cannot send notification to ${serverName}: Not connected.`);
        span.addEvent("Connection not available");
        span.setStatus({ code: SpanStatusCode.ERROR, message: "Connection not available" });
        span.end();
        return;
      }

      try {
        const notificationWithRpc = { ...notification, jsonrpc: "2.0" };
        
        // Send the notification
        handler.sendNotification(serverName, notificationWithRpc);
        
        // Update history
        updateConnectionState(serverName, (prevState) => ({
          ...(prevState ?? initializeConnectionState(serverName)),
          history: [
            ...(prevState?.history ?? []),
            { id: `notif-${Date.now()}`, request: notificationWithRpc, timestamp: Date.now() },
          ],
        }));
        
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to send notification for ${serverName}: ${errorMessage}`);
        span.recordException(error instanceof Error ? error : new Error(errorMessage));
        span.setStatus({ code: SpanStatusCode.ERROR, message: `Send Error: ${errorMessage}` });
      } finally {
        span.end();
      }
    },
    [connections, updateConnectionState, initializeConnectionState],
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
    [updateConnectionState, initializeConnectionState]
  );

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Disconnect all handlers
      connectionHandlers.current.forEach((handler, name) => {
        console.info(`[Manager] Cleaning up connection for ${name} on unmount.`);
        handler.disconnect(name);
      });
      connectionHandlers.current.clear();
      
      // Clear all pending requests
      pendingRequests.current.forEach((serverRequests) => {
        serverRequests.forEach(({ reject, timeoutId }) => {
          clearTimeout(timeoutId);
          reject(new Error("Component unmounted"));
        });
        serverRequests.clear();
      });
      pendingRequests.current.clear();
    };
  }, []);

  // Return the public API including selectors
  return useMemo(() => ({
    connect,
    disconnect,
    makeRequest,
    sendNotification,
    getConnectionState,
    getConnectionStatus,
    getCapabilities,
    getConnectedServerNames,
    clearHistory,
  }), [
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