import { z } from 'zod';
import {
    McpConnectionState, ManagedServerState, JsonRpcRequestSchema, JsonRpcNotificationSchema,
    JsonRpcResponseSchema, JsonRpcMessageSchema, ToolSchema, Tool // Import ToolSchema and Tool type
} from "./mcp.types"; // Use correct relative path

// --- Client -> Server Message Types ---

export const ListServersRequestSchema = z.object({
  type: z.literal('listServers'),
});
export type ListServersRequest = z.infer<typeof ListServersRequestSchema>;

export const ConnectServerRequestSchema = z.object({
  type: z.literal('connect'),
  serverId: z.string(),
});
export type ConnectServerRequest = z.infer<typeof ConnectServerRequestSchema>;

export const DisconnectServerRequestSchema = z.object({
  type: z.literal('disconnect'),
  serverId: z.string(),
});
export type DisconnectServerRequest = z.infer<typeof DisconnectServerRequestSchema>;

// --- NEW: GetTools Request ---
export const GetToolsRequestSchema = z.object({
    type: z.literal('getTools'),
    serverId: z.string(),
});
export type GetToolsRequest = z.infer<typeof GetToolsRequestSchema>;

export const McpApiRequestSchema = z.object({
    type: z.literal('request'),
    serverId: z.string(),
    request: JsonRpcRequestSchema.omit({ jsonrpc: true }),
});
export type McpApiRequest = z.infer<typeof McpApiRequestSchema>;


export const McpApiNotificationSchema = z.object({
    type: z.literal('notification'),
    serverId: z.string(),
    notification: JsonRpcNotificationSchema.omit({ jsonrpc: true }),
});
export type McpApiNotification = z.infer<typeof McpApiNotificationSchema>;


export const ClientToServerMessageSchema = z.union([
  ListServersRequestSchema,
  ConnectServerRequestSchema,
  DisconnectServerRequestSchema,
  GetToolsRequestSchema,
  McpApiRequestSchema,
  McpApiNotificationSchema,
]);
export type ClientToServerMessage = z.infer<typeof ClientToServerMessageSchema>;


// --- Server -> Client Message Types ---

export const ServerListResponseSchema = z.object({
  type: z.literal('serverList'),
  servers: z.array(z.custom<ManagedServerState>()),
});
export type ServerListResponse = z.infer<typeof ServerListResponseSchema>;


export const ServerStatusUpdateSchema = z.object({
  type: z.literal('statusUpdate'),
  serverId: z.string(),
  status: z.nativeEnum(McpConnectionState),
  error: z.string().optional(),
});
export type ServerStatusUpdate = z.infer<typeof ServerStatusUpdateSchema>;

// --- NEW: ToolList Response ---
export const ToolListResponseSchema = z.object({
    type: z.literal('toolList'),
    serverId: z.string(),
    tools: z.array(ToolSchema), // Use the Tool Zod schema
    error: z.string().optional(),
});
export type ToolListResponse = z.infer<typeof ToolListResponseSchema>;


export const McpApiResponseSchema = z.object({
    type: z.literal('response'),
    serverId: z.string(),
    response: JsonRpcResponseSchema,
});
export type McpApiResponse = z.infer<typeof McpApiResponseSchema>;


export const McpServerNotificationSchema = z.object({
    type: z.literal('notification'),
    serverId: z.string(),
    notification: JsonRpcMessageSchema,
});
export type McpServerNotification = z.infer<typeof McpServerNotificationSchema>;


export const ServerStderrMessageSchema = z.object({
    type: z.literal('stderr'),
    serverId: z.string(),
    data: z.string(),
});
export type ServerStderrMessage = z.infer<typeof ServerStderrMessageSchema>;

export const ApiErrorResponseSchema = z.object({
    type: z.literal('error'),
    message: z.string(),
    originalRequestId: z.union([z.string(), z.number()]).optional(),
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;


export const ServerToClientMessageSchema = z.union([
  ServerListResponseSchema,
  ServerStatusUpdateSchema,
  ToolListResponseSchema,
  McpApiResponseSchema,
  McpServerNotificationSchema,
  ServerStderrMessageSchema,
  ApiErrorResponseSchema,
]);
export type ServerToClientMessage = z.infer<typeof ServerToClientMessageSchema>;