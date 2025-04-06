// src/lib/contexts/McpManagerContext.tsx
'use client';

import React, {
  createContext, useContext, useState, useEffect, useCallback, useRef,
  type ReactNode, type FC, useMemo
} from 'react';
import { toast } from 'sonner';
import {
  ManagedServerState, McpConnectionState, JsonRpcRequest, JsonRpcNotification,
  JsonRpcResponse, Tool, JsonRpcErrorResponseSchema, JsonRpcSuccessResponseSchema, // Import specific schemas
  JsonRpcNotificationSchema // Import notification schema
} from "@/lib/mcp/mcp.types"; // Adjust path if needed
import {
  ClientToServerMessage, ServerToClientMessage, ServerToClientMessageSchema,
  McpApiResponse, ToolListResponse
} from '@/lib/mcp/api.types'; // Adjust path if needed
import { generateUUID } from '@/lib/utils';

type WebSocketStatus = 'connecting' | 'open' | 'closed' | 'error';

interface PendingRequest {
  resolve: (res: JsonRpcResponse) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

type ToolFetchStatus = 'idle' | 'fetching' | 'fetched' | 'error';

interface ServerToolState {
    status: ToolFetchStatus;
    tools: Tool[] | null;
}

interface McpManagerContextType {
  wsStatus: WebSocketStatus;
  serverStates: Record<string, ManagedServerState>;
  serverTools: Record<string, ServerToolState>;
  connectToServer: (serverId: string) => void;
  disconnectFromServer: (serverId: string) => void;
  sendMcpRequest: (
    serverId: string,
    request: Omit<JsonRpcRequest, 'jsonrpc' | 'id'> & { id?: string | number },
    timeoutMs?: number,
  ) => Promise<JsonRpcResponse>;
  sendMcpNotification: (
    serverId: string,
    notification: Omit<JsonRpcNotification, 'jsonrpc'>,
  ) => void;
  fetchToolsForServer: (serverId: string) => void;
}

const McpManagerContext = createContext<McpManagerContextType | undefined>(undefined);
const DEFAULT_REQUEST_TIMEOUT = 30000;

const getWebSocketUrl = (): string => {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = process.env.NEXT_PUBLIC_MCP_MANAGER_WS_HOST || window.location.hostname;
    const wsPort = process.env.NEXT_PUBLIC_MCP_MANAGER_WS_PORT || '6278';
    return `${wsProto}//${wsHost}:${wsPort}`;
};

export const McpManagerProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [wsStatus, setWsStatus] = useState<WebSocketStatus>('connecting');
  const [serverStates, setServerStates] = useState<Record<string, ManagedServerState>>({});
  const [serverTools, setServerTools] = useState<Record<string, ServerToolState>>({});
  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const pendingRequests = useRef<Map<string | number, PendingRequest>>(new Map());
  const connectionAttemptActive = useRef(false);
  const isUnmountingRef = useRef(false); // Definition is correct

  const sendMessage = useCallback((message: ClientToServerMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
        console.debug('[McpManagerContext] Sending WS:', message.type);
      ws.current.send(JSON.stringify(message));
    } else {
      console.error('[McpManagerContext] Cannot send, WS not open.');
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (connectionAttemptActive.current || (ws.current && ws.current.readyState !== WebSocket.CLOSED)) {
        console.debug(`[McpManagerContext] WS connect skipped (active: ${connectionAttemptActive.current}, state: ${ws.current?.readyState})`);
        return () => {}; // Return no-op cleanup
    }
    connectionAttemptActive.current = true;
    setWsStatus('connecting'); console.log('[McpManagerContext] Attempting WS connection...');
    if (reconnectTimeout.current) { clearTimeout(reconnectTimeout.current); reconnectTimeout.current = null; }
    if (ws.current) { console.log("[McpManagerContext] Closing existing WS before reconnect..."); ws.current.close(1000, "New connection attempt"); ws.current = null; }

    const socketUrl = getWebSocketUrl();
    let socketInstance: WebSocket | null = null; // Use local var for instance
    try { socketInstance = new WebSocket(socketUrl); }
    catch (error) {
        console.error("[McpManagerContext] WS constructor failed:", error); setWsStatus('error'); connectionAttemptActive.current = false;
        if (!isUnmountingRef.current && reconnectAttempts.current < 5) {
             const delay = Math.pow(2, reconnectAttempts.current++) * 1000; console.log(`[McpManagerContext] Scheduling reconnect after constructor error in ${delay}ms...`);
             reconnectTimeout.current = setTimeout(connectWebSocket, delay);
        } else { toast.error("Failed to establish WS connection."); } return () => {}; // Return no-op cleanup
    }

    let isOpen = false; // Track if open was ever called for this instance

    const handleOpen = () => {
      // Ensure this handler is for the socket we just created AND it hasn't been superseded
      if (socketInstance && (ws.current === null || ws.current === socketInstance)) {
         isOpen = true; // Mark as opened
         console.log('[McpManagerContext] WebSocket connected.'); connectionAttemptActive.current = false;
         ws.current = socketInstance; // Assign to ref only on successful open
         setWsStatus('open'); reconnectAttempts.current = 0;
         sendMessage({ type: 'listServers' });
      } else { console.log('[McpManagerContext] Ignoring open from stale/superseded socket.'); socketInstance?.close(1000, "Stale connection opened"); }
    };

    const handleClose = (event: CloseEvent) => {
      console.warn(`[McpManagerContext] WebSocket closed. Code: ${event.code}`); connectionAttemptActive.current = false;
      // Only act if this socket was the currently active one or if the ref is already null
      if (ws.current === socketInstance || ws.current === null) {
          if (ws.current === socketInstance) ws.current = null; // Clear the main ref
          setWsStatus('closed'); setServerStates({}); setServerTools({});
          pendingRequests.current.forEach((req) => { clearTimeout(req.timer); req.reject(new Error('WS closed')); }); pendingRequests.current.clear();
          // --- MODIFIED: Check unmounting ref state ---
          if (!event.wasClean && !isUnmountingRef.current && reconnectAttempts.current < 5) {
            const delay = Math.pow(2, reconnectAttempts.current++) * 1000; console.log(`[McpManagerContext] Scheduling reconnect ${reconnectAttempts.current} in ${delay}ms...`);
            reconnectTimeout.current = setTimeout(connectWebSocket, delay);
          } else if (reconnectAttempts.current >= 5) { console.error('[McpManagerContext] Max reconnects.'); toast.error("WS Reconnect failed."); }
      } else { console.log("[McpManagerContext] Ignoring close from non-current socket."); }
      // Ensure listeners are removed from this specific instance regardless
      removeSocketListeners();
    };

    const handleError = (error: Event) => { console.error('[McpManagerContext] WebSocket error:', error); connectionAttemptActive.current = false; if (ws.current === socketInstance) { setWsStatus('error'); } socketInstance?.close(); }; // Trigger close

    const handleMessage = (event: MessageEvent) => {
       if (ws.current !== socketInstance || isUnmountingRef.current) return;
        try {
            const messageData = JSON.parse(event.data.toString());
            const validation = ServerToClientMessageSchema.safeParse(messageData);
            if (!validation.success) { console.warn('[McpManagerContext] Invalid message:', validation.error.errors); return; }
            const message = validation.data;
            // --- Processing logic (ensure correct property access) ---
            switch (message.type) {
                case 'serverList':
                    const newStates: Record<string, ManagedServerState> = {};
                    message.servers.forEach((s) => { newStates[s.id] = s; });
                    setServerStates(newStates);
                    setServerTools(prevTools => { const ut = {...prevTools}; message.servers.forEach(s => { if (!(s.id in ut)) { ut[s.id] = { status: 'idle', tools: null }; } }); return ut; });
                    break;
                case 'statusUpdate':
                    setServerStates((prev) => ({ ...prev, [message.serverId]: { ...(prev[message.serverId] || { id: message.serverId, label: 'Unknown', status: message.status }), status: message.status, error: message.error } }));
                    if(message.status === McpConnectionState.Stopped || message.status === McpConnectionState.Failed) { setServerTools(prev => ({...prev, [message.serverId]: { status: 'idle', tools: null }})); }
                    break;
                case 'toolList':
                    setServerTools(prev => ({ ...prev, [message.serverId]: { status: message.error ? 'error' : 'fetched', tools: message.error ? null : message.tools } }));
                    if(message.error) { toast.error(`Tools fetch failed for ${serverStates[message.serverId]?.label || message.serverId}: ${message.error}`); }
                    break;
                case 'response':
                    if (message.response.id === null) { console.warn('[McpManagerContext] Null ID response'); break; }
                    const pending = pendingRequests.current.get(message.response.id);
                    if (pending) {
                        clearTimeout(pending.timer);
                        if ('error' in message.response) { console.warn(`[McpManagerContext] MCP Error (ID: ${message.response.id}):`, message.response.error); pending.reject(new McpError(message.response.error.message, message.response.error.code, message.response.error.data)); }
                        else { pending.resolve(message.response); }
                        pendingRequests.current.delete(message.response.id);
                    } else { console.warn(`[McpManagerContext] Unknown request ID: ${message.response.id}`); }
                    break;
                case 'notification':
                     // --- MODIFIED: Type check before accessing .method ---
                    const notificationValidation = JsonRpcNotificationSchema.safeParse(message.notification);
                    if (notificationValidation.success) {
                        console.log(`[McpManagerContext] MCP Notif (from ${message.serverId}):`, notificationValidation.data.method);
                    } else {
                        console.log(`[McpManagerContext] Received non-notification message forwarded as notification from ${message.serverId}`);
                    }
                    break;
                case 'stderr': console.log(`[McpManagerContext] MCP Stderr (from ${message.serverId}): ${message.data.trim()}`); break;
                case 'error':
                    console.error(`[McpManagerContext] API Error: ${message.message}`); toast.error(`Manager Error: ${message.message}`);
                     if(message.originalRequestId !== null && message.originalRequestId && pendingRequests.current.has(message.originalRequestId)) {
                        const failedReq = pendingRequests.current.get(message.originalRequestId);
                        if(failedReq) { clearTimeout(failedReq.timer); failedReq.reject(new Error(`Backend API Error: ${message.message}`)); pendingRequests.current.delete(message.originalRequestId); }
                     }
                    break;
                default: const exhaustiveCheck: never = message; console.warn(`[McpManagerContext] Unhandled type: ${(exhaustiveCheck as any)?.type}`);
            }
        } catch (error: any) { console.error('[McpManagerContext] Failed processing message:', error.message); }
    };

    // --- NEW: Separate listener removal function ---
    const removeSocketListeners = () => {
        if (socketInstance) {
            socketInstance.removeEventListener('open', handleOpen);
            socketInstance.removeEventListener('close', handleClose);
            socketInstance.removeEventListener('error', handleError);
            socketInstance.removeEventListener('message', handleMessage);
        }
    }

    socketInstance.addEventListener('open', handleOpen);
    socketInstance.addEventListener('close', handleClose);
    socketInstance.addEventListener('error', handleError);
    socketInstance.addEventListener('message', handleMessage);

    // Return cleanup specific to *this* socket instance/attempt
    return () => {
        console.log("[McpManagerContext] Cleanup running for connectWebSocket attempt.");
        removeSocketListeners(); // Use the helper
        // Only close if it hasn't successfully opened AND become the main ws.current instance
        if (!isOpen && ws.current !== socketInstance && socketInstance?.readyState !== WebSocket.CLOSED) {
            console.log("[McpManagerContext] Closing unsuccessful/stale socket attempt.");
            socketInstance?.close(1000, "Cleanup unsuccessful attempt");
        }
        // Reset connection flag if this specific attempt failed without opening/closing cleanly
        if (!isOpen) {
            connectionAttemptActive.current = false;
        }
    };

  }, [sendMessage]); // Use stable sendMessage

  // Effect for mounting and unmounting
  useEffect(() => {
    isUnmountingRef.current = false; // Reset on mount
    const cleanupListeners = connectWebSocket(); // Start connection

    return () => {
       isUnmountingRef.current = true; // --- MODIFIED: Set flag correctly ---
       console.log('[McpManagerContext] Provider unmounting - Cleaning up.');
       if (reconnectTimeout.current) { clearTimeout(reconnectTimeout.current); }
       pendingRequests.current.forEach(req => { clearTimeout(req.timer); req.reject(new Error("Component unmounted")); });
       pendingRequests.current.clear();
       const socketToClose = ws.current;
       ws.current = null;
       connectionAttemptActive.current = false;
       socketToClose?.close(1000, "Provider unmounting");
       cleanupListeners?.(); // Run cleanup returned by connectWebSocket
    };
  }, [connectWebSocket]);


  const connectToServer = useCallback((serverId: string) => sendMessage({ type: 'connect', serverId }), [sendMessage]);
  const disconnectFromServer = useCallback((serverId: string) => sendMessage({ type: 'disconnect', serverId }), [sendMessage]);
  const fetchToolsForServer = useCallback((serverId: string) => {
      setServerTools(prev => {
          const current = prev[serverId];
          if (!current || current.status === 'idle' || current.status === 'error') {
               console.log(`[McpManagerContext] Requesting tools for ${serverId} (Status: ${current?.status ?? 'idle'})...`);
               sendMessage({ type: 'getTools', serverId });
               return { ...prev, [serverId]: { status: 'fetching', tools: current?.tools ?? null } };
          }
           console.debug(`[McpManagerContext] Skipping fetch for ${serverId}, status: ${current.status}`);
           return prev;
      });
  }, [sendMessage]);

   const sendMcpRequest = useCallback(( serverId: string, request: Omit<JsonRpcRequest, 'jsonrpc' | 'id'> & { id?: string | number }, timeoutMs: number = DEFAULT_REQUEST_TIMEOUT ): Promise<JsonRpcResponse> => {
        return new Promise((resolve, reject) => {
             if (wsStatus !== 'open') { return reject(new Error("WebSocket not open.")); }
            const requestId = request.id ?? generateUUID();
             if (pendingRequests.current.has(requestId)) { return reject(new Error(`Duplicate request ID: ${requestId}`)); }
             const timer = setTimeout(() => { pendingRequests.current.delete(requestId); console.error(`[McpManagerContext] Request ${requestId} timed out.`); reject(new Error(`Request timed out.`)); }, timeoutMs);
             pendingRequests.current.set(requestId, { resolve, reject, timer });
             sendMessage({ type: 'request', serverId, request: { ...request, id: requestId } });
        });
    }, [sendMessage, wsStatus]);

  const sendMcpNotification = useCallback(( serverId: string, notification: Omit<JsonRpcNotification, 'jsonrpc'> ) => {
    sendMessage({ type: 'notification', serverId, notification });
  }, [sendMessage]);

  const contextValue = useMemo(() => ({
    wsStatus, serverStates, serverTools, connectToServer, disconnectFromServer,
    sendMcpRequest, sendMcpNotification, fetchToolsForServer
  }), [ wsStatus, serverStates, serverTools, connectToServer, disconnectFromServer, sendMcpRequest, sendMcpNotification, fetchToolsForServer ]);

  return ( <McpManagerContext.Provider value={contextValue}> {children} </McpManagerContext.Provider> );
};

export function useMcpManager() {
  const context = useContext(McpManagerContext);
  if (context === undefined) { throw new Error('useMcpManager must be used within a McpManagerProvider'); }
  return context;
}

class McpError extends Error { code: number; data?: unknown; constructor(message: string, code: number, data?: unknown) { super(message); this.name = 'McpError'; this.code = code; this.data = data; } }