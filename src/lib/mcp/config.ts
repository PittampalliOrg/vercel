// src/lib/mcp/config.ts
import { z } from "zod";

export const StdioConfigSchema = z.object({
  name: z.string().min(1, "Server name is required"),
  transport: z.literal("stdio"),
  command: z.string().min(1, "Command is required"),
  args: z.array(z.string()).optional().default([]),
  env: z.record(z.string()).optional().default({}), // Required, defaults to empty
});
export type StdioConfig = z.infer<typeof StdioConfigSchema>;

export const SSEConfigSchema = z.object({
  name: z.string().min(1, "Server name is required"),
  transport: z.literal("sse"),
  url: z.string().url("Invalid URL format"),
  headers: z.record(z.string()).optional().default({}), // Required, defaults to empty
});
export type SSEConfig = z.infer<typeof SSEConfigSchema>;

// Use discriminatedUnion for clear type checking based on 'transport'
export const ServerConfigSchema = z.discriminatedUnion("transport", [
  StdioConfigSchema,
  SSEConfigSchema,
]);
export type ServerConfig = z.infer<typeof ServerConfigSchema>;