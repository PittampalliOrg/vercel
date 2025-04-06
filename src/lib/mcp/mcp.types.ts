import { z } from 'zod';

// --- Basic JSON-RPC Types ---
export const JsonRpcVersionSchema = z.literal('2.0');
export const JsonRpcIdSchema = z.union([z.string(), z.number(), z.null()]);

export const JsonRpcRequestSchema = z.object({
  jsonrpc: JsonRpcVersionSchema,
  id: JsonRpcIdSchema.refine((val) => val !== null, {
    message: 'Request ID must not be null',
  }), // id is required for requests
  method: z.string(),
  params: z.union([z.record(z.unknown()), z.array(z.unknown())]).optional(),
});
export type JsonRpcRequest = z.infer<typeof JsonRpcRequestSchema>;

export const JsonRpcNotificationSchema = z.object({
  jsonrpc: JsonRpcVersionSchema,
  method: z.string(),
  params: z.union([z.record(z.unknown()), z.array(z.unknown())]).optional(),
});
export type JsonRpcNotification = z.infer<typeof JsonRpcNotificationSchema>;

export const JsonRpcErrorSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.unknown().optional(),
});
export type JsonRpcError = z.infer<typeof JsonRpcErrorSchema>;

export const JsonRpcSuccessResponseSchema = z.object({
  jsonrpc: JsonRpcVersionSchema,
  id: JsonRpcIdSchema,
  result: z.unknown(),
});
export type JsonRpcSuccessResponse = z.infer<typeof JsonRpcSuccessResponseSchema>;

export const JsonRpcErrorResponseSchema = z.object({
  jsonrpc: JsonRpcVersionSchema,
  id: JsonRpcIdSchema,
  error: JsonRpcErrorSchema,
});
export type JsonRpcErrorResponse = z.infer<typeof JsonRpcErrorResponseSchema>;

export const JsonRpcResponseSchema = z.union([
  JsonRpcSuccessResponseSchema,
  JsonRpcErrorResponseSchema,
]);
export type JsonRpcResponse = z.infer<typeof JsonRpcResponseSchema>;

export const JsonRpcMessageSchema = z.union([
  JsonRpcRequestSchema,
  JsonRpcNotificationSchema,
  JsonRpcResponseSchema,
]);
export type JsonRpcMessage = z.infer<typeof JsonRpcMessageSchema>;


// --- NEW: MCP Tool Types (Based on modelContextProtocol.ts) ---

// Basic JSON Schema Object representation for Zod validation
// This is a simplified version; a full JSON schema validator might be needed for complex cases.
const BaseJsonSchema: z.ZodType<any> = z.lazy(() => z.object({
    type: z.string().optional(),
    description: z.string().optional(),
    properties: z.record(BaseJsonSchema).optional(),
    required: z.array(z.string()).optional(),
    items: BaseJsonSchema.optional(),
    enum: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
    // Add other JSON schema properties as needed
}));

export const ToolInputSchema = z.object({
    type: z.literal("object"),
    properties: z.record(BaseJsonSchema).optional(),
    required: z.array(z.string()).optional(),
});
export type ToolInputSchema = z.infer<typeof ToolInputSchema>;

export const ToolSchema = z.object({
    name: z.string(),
    description: z.string().optional(),
    inputSchema: ToolInputSchema,
});
export type Tool = z.infer<typeof ToolSchema>; // Export the Zod inferred type

// Interface matching the MCP namespace Tool (useful for type checking)
export interface MCPToolInterface {
     name: string;
     description?: string;
     inputSchema: {
         type: "object";
         properties?: { [key: string]: object }; // Use generic object for properties
         required?: string[];
     };
}

// Define Result and PaginatedResult schemas (assuming basic structure)
export const ResultSchema = z.object({
    _meta: z.record(z.unknown()).optional(),
}).catchall(z.unknown()); // Allow other properties

export const PaginatedResultSchema = ResultSchema.extend({
    nextCursor: z.string().optional(), // Opaque cursor
});

export const ListToolsResultSchema = PaginatedResultSchema.extend({
    tools: z.array(ToolSchema), // Use the Tool schema defined above
});
export type ListToolsResult = z.infer<typeof ListToolsResultSchema>;


// --- MCP Server Definition Types (Adapted from VS Code) ---

export const StdioMcpConnectionDefinitionPartSchema = z.object({
  transport: z.literal('stdio'),
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
});
export type StdioMcpConnectionDefinitionPart = z.infer<
  typeof StdioMcpConnectionDefinitionPartSchema
>;

export const SseMcpConnectionDefinitionPartSchema = z.object({
  transport: z.literal('sse'),
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
});
export type SseMcpConnectionDefinitionPart = z.infer<
  typeof SseMcpConnectionDefinitionPartSchema
>;

export const McpServerDefinitionSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  transport: z.enum(['stdio', 'sse']), // Discriminator
}).and(z.union([StdioMcpConnectionDefinitionPartSchema, SseMcpConnectionDefinitionPartSchema]));

export type McpServerDefinition = z.infer<typeof McpServerDefinitionSchema>;

// --- Connection State Types (Adapted from VS Code) ---

export enum McpConnectionState {
  Stopped = 0,
  Starting = 1,
  Running = 2,
  Failed = 3, // Indicates a failure to start or a crash
  Stopping = 4, // Indicates graceful shutdown in progress
}

// Combined state for API reporting
export type ManagedServerState = {
  id: string;
  label: string;
  status: McpConnectionState;
  error?: string; // Last error message if status is Failed
};