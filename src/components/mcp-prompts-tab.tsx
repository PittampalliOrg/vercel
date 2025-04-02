// src/app/(mcp)/components/mcp-prompts-tab.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useMCPConnections } from "./mcp-connection-provider";
import { ListPane } from "@/components/ui/list-pane";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JsonView } from "@/components/ui/json-view";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import {
  Prompt,
  ListPromptsResultSchema,
  GetPromptResultSchema,
} from "@modelcontextprotocol/sdk/types.js";

interface McpPromptsTabProps {
  serverName: string;
  capabilities: any;
}

export function McpPromptsTab({ serverName, capabilities }: McpPromptsTabProps) {
  const { makeRequest } = useMCPConnections();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [promptContent, setPromptContent] = useState<any>(null);
  const [promptArgs, setPromptArgs] = useState<Record<string, string>>({});
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listPrompts = useCallback(async (useCursor?: string) => {
    setIsLoadingList(true);
    setError(null);
    try {
      const result = await makeRequest(serverName, {
        method: "prompts/list",
        params: useCursor ? { cursor: useCursor } : {},
      });
      const validation = ListPromptsResultSchema.safeParse(result);
      if (!validation.success) throw new Error(`Invalid response: ${validation.error.message}`);
      const data = validation.data;
      setPrompts((prev) => useCursor ? [...prev, ...(data.prompts ?? [])] : (data.prompts ?? []));
      setNextCursor(data.nextCursor);
    } catch (err: any) {
      const errorMsg = `Failed to list prompts: ${err.message ?? String(err)}`;
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoadingList(false);
    }
  }, [makeRequest, serverName]);

  const getPrompt = useCallback(async (name: string, args: Record<string, string>) => {
    if (!name) return;
    setIsLoadingContent(true);
    setError(null);
    setPromptContent(null);
    try {
      const result = await makeRequest(serverName, {
        method: "prompts/get",
        params: { name, arguments: args },
      });
      const validation = GetPromptResultSchema.safeParse(result);
      if (!validation.success) throw new Error(`Invalid response: ${validation.error.message}`);
      setPromptContent(validation.data);
    } catch (err: any) {
      const errorMsg = `Failed to get prompt ${name}: ${err.message ?? String(err)}`;
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoadingContent(false);
    }
  }, [makeRequest, serverName]);

  useEffect(() => {
    listPrompts();
    setSelectedPrompt(null);
    setPromptContent(null);
    setPromptArgs({});
    setError(null);
  }, [serverName, listPrompts]);

  const handleSelectItem = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setPromptContent(null); // Clear previous content
    setPromptArgs({}); // Reset args
    setError(null); // Clear errors
  };

  const handleArgChange = (argName: string, value: string) => {
    setPromptArgs(prev => ({ ...prev, [argName]: value }));
  };

  const handleGetPromptClick = () => {
    if (selectedPrompt) {
      getPrompt(selectedPrompt.name, promptArgs);
    }
  }

  const handleRefresh = () => {
    setPrompts([]);
    setNextCursor(undefined);
    setSelectedPrompt(null);
    setPromptContent(null);
    listPrompts();
  }

  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      <div className="col-span-1 h-full">
        <ListPane
          title="Prompts"
          items={prompts}
          selectedItemName={selectedPrompt?.name ?? null}
          onSelectItem={handleSelectItem}
          onRefresh={handleRefresh}
          isLoading={isLoadingList}
          onListMore={nextCursor ? () => listPrompts(nextCursor) : undefined}
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
        {selectedPrompt ? (
          <div className="space-y-4">
            <h4 className="font-semibold">{selectedPrompt.name}</h4>
            {selectedPrompt.description && <p className="text-sm text-muted-foreground">{selectedPrompt.description}</p>}
            {(selectedPrompt.arguments?.length ?? 0) > 0 && (
              <div className="space-y-3 border p-3 rounded-md">
                <h5 className="text-sm font-medium">Arguments</h5>
                {selectedPrompt.arguments?.map(arg => (
                  <div key={arg.name}>
                    <Label htmlFor={`prompt-arg-${arg.name}`}>{arg.name} {arg.required && '*'}</Label>
                    <Input
                      id={`prompt-arg-${arg.name}`}
                      value={promptArgs[arg.name] ?? ''}
                      onChange={(e) => handleArgChange(arg.name, e.target.value)}
                      placeholder={arg.description ?? ''}
                    />
                  </div>
                ))}
              </div>
            )}
            <Button onClick={handleGetPromptClick} disabled={isLoadingContent}>
              Get Prompt Content {isLoadingContent && "..."}
            </Button>
            {isLoadingContent && <p className="text-muted-foreground">Loading content...</p>}
            {promptContent !== null && <JsonView data={promptContent} />}
          </div>
        ) : (
          <p className="text-muted-foreground">Select a prompt to view details and arguments.</p>
        )}
      </div>
    </div>
  );
}