// src/app/(mcp)/components/mcp-tools-tab.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useMCPConnections } from "./mcp-connection-provider";
import { ListPane } from "@/components/ui/list-pane";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // For JSON input
import { JsonView } from "@/components/ui/json-view";
import { toast } from "sonner";
import { AlertCircle, Send } from "lucide-react";
import {
  Tool,
  ListToolsResultSchema,
  CallToolResultSchema, // Assuming compatibility for now
  CompatibilityCallToolResult,
} from "@modelcontextprotocol/sdk/types.js";

interface McpToolsTabProps {
  serverName: string;
  capabilities: any;
}

export function McpToolsTab({ serverName, capabilities }: McpToolsTabProps) {
  const { makeRequest } = useMCPConnections();
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [toolParamsJson, setToolParamsJson] = useState<string>('{}');
  const [toolResult, setToolResult] = useState<CompatibilityCallToolResult | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingCall, setIsLoadingCall] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const listTools = useCallback(async (useCursor?: string) => {
    setIsLoadingList(true);
    setError(null);
    try {
      const result = await makeRequest(serverName, {
        method: "tools/list",
        params: useCursor ? { cursor: useCursor } : {},
      });
      const validation = ListToolsResultSchema.safeParse(result);
      if (!validation.success) throw new Error(`Invalid response: ${validation.error.message}`);
      const data = validation.data;
      setTools((prev) => useCursor ? [...prev, ...(data.tools ?? [])] : (data.tools ?? []));
      setNextCursor(data.nextCursor);
    } catch (err: any) {
      const errorMsg = `Failed to list tools: ${err.message ?? String(err)}`;
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoadingList(false);
    }
  }, [makeRequest, serverName]);

  const callTool = useCallback(async (name: string, params: Record<string, unknown>) => {
    if (!name) return;
    setIsLoadingCall(true);
    setError(null);
    setToolResult(null);
    try {
      const result = await makeRequest<CompatibilityCallToolResult>(serverName, {
        method: "tools/call",
        params: { name, arguments: params },
      });
      // Result type might be CompatibilityCallToolResult or just CallToolResult
      // Assuming Compatibility for now based on inspector
      setToolResult(result);
    } catch (err: any) {
      const errorMsg = `Failed to call tool ${name}: ${err.message ?? String(err)}`;
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoadingCall(false);
    }
  }, [makeRequest, serverName]);

  useEffect(() => {
    listTools();
    setSelectedTool(null);
    setToolParamsJson('{}');
    setToolResult(null);
    setError(null);
  }, [serverName, listTools]);

  const handleSelectItem = (tool: Tool) => {
    setSelectedTool(tool);
    setToolParamsJson('{}'); // Reset params
    setToolResult(null);
    setError(null);
    setJsonError(null);
  };

  const handleParamsChange = (value: string) => {
    setToolParamsJson(value);
    // Basic JSON validation on change
    try {
      JSON.parse(value);
      setJsonError(null);
    } catch (e: any) {
      setJsonError(`Invalid JSON: ${e.message}`);
    }
  }

  const handleCallToolClick = () => {
    if (selectedTool && !jsonError) {
      try {
        const params = JSON.parse(toolParamsJson);
        callTool(selectedTool.name, params);
      } catch (e: any) {
        const errorMsg = `Invalid JSON parameters: ${e.message}`;
        setJsonError(errorMsg);
        toast.error(errorMsg);
      }
    } else if (jsonError) {
      toast.error(jsonError);
    }
  }

  const handleRefresh = () => {
    setTools([]);
    setNextCursor(undefined);
    setSelectedTool(null);
    setToolResult(null);
    listTools();
  }

  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      <div className="col-span-1 h-full">
        <ListPane
          title="Tools"
          items={tools}
          selectedItemName={selectedTool?.name ?? null}
          onSelectItem={handleSelectItem}
          onRefresh={handleRefresh}
          isLoading={isLoadingList}
          onListMore={nextCursor ? () => listTools(nextCursor) : undefined}
          isListMoreDisabled={!nextCursor}
        />
      </div>
      <div className="col-span-2 border rounded-lg p-4 overflow-auto">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {selectedTool ? (
          <div className="space-y-4">
            <h4 className="font-semibold">{selectedTool.name}</h4>
            {selectedTool.description && <p className="text-sm text-muted-foreground">{selectedTool.description}</p>}

            {/* Input Schema Display */}
            <div>
              <Label className="text-sm font-medium">Input Schema</Label>
              <JsonView data={selectedTool.inputSchema} />
            </div>

            {/* Parameters Input */}
            <div>
              <Label htmlFor="tool-params">Parameters (JSON)</Label>
              <Textarea
                id="tool-params"
                value={toolParamsJson}
                onChange={(e) => handleParamsChange(e.target.value)}
                rows={6}
                className="font-mono text-xs"
                placeholder='Enter JSON parameters, e.g., {"query": "hello"}'
              />
              {jsonError && <p className="text-xs text-red-500 mt-1">{jsonError}</p>}
            </div>

            <Button onClick={handleCallToolClick} disabled={isLoadingCall || !!jsonError}>
              <Send className="w-4 h-4 mr-2" /> Run Tool {isLoadingCall && "..."}
            </Button>

            {/* Tool Result */}
            {isLoadingCall && <p className="text-muted-foreground">Calling tool...</p>}
            {toolResult !== null && (
              <div>
                <h5 className="font-medium mt-4 mb-2">Result</h5>
                <JsonView data={toolResult} />
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">Select a tool to view details and call it.</p>
        )}
      </div>
    </div>
  );
}