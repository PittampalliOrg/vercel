import { Tool } from "@modelcontextprotocol/sdk/types.js"; // Type from older SDK
import { Tool as AiTool, ToolSet } from "ai"; // Types from Vercel AI SDK
import { z, ZodType } from "zod"; // Import Zod

// Basic JSON Schema representation used by older SDK (adjust if needed based on actual schema structure)
type JsonSchema = {
    type: string;
    properties?: Record<string, JsonSchema | { type: string; description?: string; enum?: string[]; items?: JsonSchema }>;
    required?: string[];
    description?: string;
    enum?: string[];
    items?: JsonSchema;
};

// Function to convert MCP Tools (older SDK) to Vercel AI SDK ToolSet format
export function convertMcpToolsToAiSdkFormat(mcpTools: Tool[]): ToolSet {
  const toolSet: ToolSet = {};

  for (const mcpTool of mcpTools) {
    if (!mcpTool.name) continue; // Skip tools without names

    // Convert the inputSchema (JSON Schema) to a Zod schema or keep as JSON schema
    // Note: For robust conversion, a dedicated JSON Schema -> Zod library might be needed,
    // but for now, we'll pass the JSON schema directly if it looks valid,
    // as Vercel AI SDK's `tool` helper supports it.
    let parametersSchema: ZodType<any, any> | JsonSchema | undefined = undefined;

    if (mcpTool.inputSchema && typeof mcpTool.inputSchema === 'object') {
        // Basic validation: check for type=object and properties
        if (mcpTool.inputSchema.type === 'object' && typeof mcpTool.inputSchema.properties === 'object') {
             // Ensure empty properties object if needed by LLM
             if (Object.keys(mcpTool.inputSchema.properties).length === 0) {
                 parametersSchema = { type: 'object', properties: {} };
             } else {
                 parametersSchema = mcpTool.inputSchema as JsonSchema; // Assume valid JSON schema
             }
        } else if (Object.keys(mcpTool.inputSchema).length === 0) {
             // Handle case where inputSchema is just {}
              parametersSchema = { type: 'object', properties: {} };
        } else {
             console.warn(`Tool '${mcpTool.name}' has potentially invalid inputSchema structure, attempting to use as is:`, mcpTool.inputSchema);
             parametersSchema = mcpTool.inputSchema as JsonSchema; // Pass through potentially problematic schema
        }
    } else {
         // Tool takes no arguments, provide valid empty schema
          parametersSchema = { type: 'object', properties: {} };
    }


    toolSet[mcpTool.name] = {
      description: mcpTool.description,
      parameters: parametersSchema,
      // No execute function needed here, as execution is handled client-side via makeRequest
    };
  }

  return toolSet;
}

// Function to format local tools (already in Vercel AI SDK format)
// This might just return the input if getLocalTools already returns a ToolSet
export function formatLocalToolsForLlm(localTools: Record<string, AiTool<any, any>>): ToolSet {
    // Assuming getLocalTools returns the correct format already
    return localTools;
}