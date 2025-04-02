// src/lib/mcp/types.ts
import type {
      ServerCapabilities,
      Request as MCPRequest,
      Notification as MCPNotification,
      Result as MCPResult,
      McpError
    } from "@modelcontextprotocol/sdk/types.js";
    import { StdioConfigSchema, SSEConfigSchema } from "./config"; // Assuming config schemas are here
    import { z } from "zod";
    
    export type ConnectionStatus =
      | "disconnected"
      | "connecting"
      | "connected"
      | "error";
    
    export interface MCPRequestRecord {
      id: number | string; // JSON-RPC request ID
      request: MCPRequest | MCPNotification; // Store notification sent as well
      timestamp: number;
      response?: MCPResult | McpError;
      responseTimestamp?: number;
      error?: string; // Error during request sending/processing
    }
    
    export interface MCPNotificationRecord {
      notification: MCPNotification;
      timestamp: number;
    }
    
    export interface StderrRecord {
      content: string;
      timestamp: number;
    }
    
    export interface ConnectionState {
      serverName: string;
      status: ConnectionStatus;
      error?: string; // Last connection or fatal error message
      capabilities?: ServerCapabilities | null;
      history: MCPRequestRecord[];
      notifications: MCPNotificationRecord[];
      stderr: StderrRecord[];
      webSocket?: WebSocket | null; // Store the WebSocket instance
      pendingRequests: Map<
        number | string,
        { resolve: (value: any) => void; reject: (reason?: any) => void }
      >;
    }
    
    // Type for messages exchanged with the Deno proxy via WebSocket
    export type ProxyWebSocketIncoming =
      | { type: "status"; status: ConnectionStatus; message?: string; capabilities?: ServerCapabilities }
      | { type: "mcp"; payload: MCPResult | McpError | MCPNotification } // Messages *from* target server
      | { type: "stderr"; content: string };
    
    export type ProxyWebSocketOutgoing =
      | { type: "connect"; config: z.infer<typeof StdioConfigSchema> | z.infer<typeof SSEConfigSchema> }
      | { type: "mcp"; payload: MCPRequest | MCPNotification }; // Messages *to* target server