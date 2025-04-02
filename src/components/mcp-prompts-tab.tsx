// src/app/(mcp)/components/mcp-prompts-tab.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useMCPConnections } from "@/components/mcp-connection-provider";
import { ListPane } from "@/components/ui/list-pane";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JsonView } from "@/components/ui/json-view";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  Prompt,
  ListPromptsResultSchema,
  GetPromptResultSchema,
  ServerCapabilities,
} from "@modelcontextprotocol/sdk/types.js";

interface McpPromptsTabProps {
  serverName: string;
  capabilities: ServerCapabilities | null | undefined;
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

  const hasPromptCapability = !!capabilities?.prompts;

  const listPrompts = useCallback(async (useCursor?: string, isRefresh = false) => {
    if (!hasPromptCapability) return;
    setIsLoadingList(true);
    if (!useCursor) {
       setError(null);
       if (isRefresh) {
         setSelectedPrompt(null);
         setPromptContent(null);
         setPromptArgs({});
       }
    }
    try {
      const result = await makeRequest(serverName, {
        method: "prompts/list",
        params: useCursor ? { cursor: useCursor } : {},
      });
      const validation = ListPromptsResultSchema.safeParse(result);
      if (!validation.success) throw new Error(`Invalid response: ${validation.error.message}`);
      const data = validation.data;
      setPrompts((prev) => (useCursor && !isRefresh) ? [...prev, ...(data.prompts ?? [])] : (data.prompts ?? []));
      setNextCursor(data.nextCursor);
    } catch (err: any) {
      const errorMsg = `Failed to list prompts: ${err.message ?? String(err)}`;
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoadingList(false);
    }
  }, [makeRequest, serverName, hasPromptCapability]);

  const getPrompt = useCallback(async (name: string, args: Record<string, string>) => {
    if (!hasPromptCapability) return;
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
  }, [makeRequest, serverName, hasPromptCapability]);

  useEffect(() => {
    if (hasPromptCapability) {
      console.log(`[PromptsTab] Fetching initial prompts for ${serverName}`);
      listPrompts(undefined, true);
    } else {
        console.log(`[PromptsTab] Skipping fetch for ${serverName} - no capability.`);
        setPrompts([]);
        setNextCursor(undefined);
        setError(null);
    }
    setSelectedPrompt(null);
    setPromptContent(null);
    setPromptArgs({});
  }, [serverName, listPrompts, hasPromptCapability]);

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

  const handleRefreshList = () => {
    listPrompts(undefined, true);
  }

  if (!hasPromptCapability) {
     return <div className="p-4 text-muted-foreground">Prompts capability not supported or unknown for this server.</div>;
  }

  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      <div className="col-span-1 h-full">
        <ListPane
          title="Prompts"
          items={prompts}
          selectedItemName={selectedPrompt?.name ?? null}
          onSelectItem={handleSelectItem}
          onRefresh={handleRefreshList}
          isLoading={isLoadingList}
          onListMore={nextCursor ? () => listPrompts(nextCursor) : undefined}
          isListMoreDisabled={!nextCursor}
        />
      </div>
      <div className="col-span-2 border rounded-lg p-4 overflow-auto flex flex-col"> {/* Added flex */}
        {error && !isLoadingContent && (
          <Alert variant="destructive" className="mb-4 shrink-0">
            <AlertCircle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {selectedPrompt ? (
          <div className="space-y-4 flex-1 flex flex-col"> {/* Added flex */}
            <div> {/* Container for header + args */}
              <h4 className="font-semibold mb-1">{selectedPrompt.name}</h4>
                {selectedPrompt.description && <p className="text-sm text-muted-foreground mb-3">{selectedPrompt.description}</p>}
                {(selectedPrompt.arguments?.length ?? 0) > 0 && (
                  <div className="space-y-3 border p-3 rounded-md mb-4">
                    <h5 className="text-sm font-medium">Arguments</h5>
                    {selectedPrompt.arguments?.map(arg => (
                      <div key={arg.name}>
                        <Label htmlFor={`prompt-arg-${arg.name}`} className="text-xs">
                            {arg.name} {arg.required && <span className="text-destructive">*</span>}
                        </Label>
                        <Input
                          id={`prompt-arg-${arg.name}`}
                          value={promptArgs[arg.name] ?? ''}
                          onChange={(e) => handleArgChange(arg.name, e.target.value)}
                          placeholder={arg.description ?? ''}
                          className="h-8 text-sm"
                        />
                      </div>
                    ))}
                  </div>
                )}
                <Button onClick={handleGetPromptClick} disabled={isLoadingContent} size="sm">
                {isLoadingContent && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
                  Get Prompt Content
                </Button>
            </div>
            {/* Content Area */}
            <div className="flex-1 overflow-auto mt-4 border rounded-md">
                {isLoadingContent && <div className="p-4 text-muted-foreground">Loading content...</div>}
                {promptContent !== null && !isLoadingContent && <JsonView data={promptContent} />}
                {!promptContent && !isLoadingContent && <div className="p-4 text-muted-foreground text-sm">Enter arguments (if any) and click 'Get Prompt Content'.</div>}
            </div>
          </div>
        ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground">
             Select a prompt to view details and arguments.
        </div>
        )}
      </div>
    </div>
  );
}