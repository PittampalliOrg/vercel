// src/app/(mcp)/components/mcp-resources-tab.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useMCPConnections } from "./mcp-connection-provider";
import { ListPane } from "@/components/ui/list-pane";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { JsonView } from "@/components/ui/json-view";
import { toast } from "sonner";
import { AlertCircle, RefreshCw } from "lucide-react";
import {
  Resource,
  ListResourcesResultSchema,
  ReadResourceResultSchema,
} from "@modelcontextprotocol/sdk/types.js";

interface McpResourcesTabProps {
  serverName: string;
  capabilities: any; // ServerCapabilities structure
}

export function McpResourcesTab({ serverName, capabilities }: McpResourcesTabProps) {
  const { makeRequest } = useMCPConnections();
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [resourceContent, setResourceContent] = useState<any>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listResources = useCallback(async (useCursor?: string) => {
    setIsLoadingList(true);
    setError(null);
    try {
      const result = await makeRequest(serverName, {
        method: "resources/list",
        params: useCursor ? { cursor: useCursor } : {},
      });
      // Validate with Zod (optional but recommended)
      const validation = ListResourcesResultSchema.safeParse(result);
      if (!validation.success) {
        throw new Error(`Invalid response format: ${validation.error.message}`);
      }
      const data = validation.data;
      setResources((prev) => useCursor ? [...prev, ...(data.resources ?? [])] : (data.resources ?? []));
      setNextCursor(data.nextCursor);
    } catch (err: any) {
      const errorMsg = `Failed to list resources: ${err.message ?? String(err)}`;
      setError(errorMsg);
      toast.error(errorMsg);
      // Clear results on error?
      // setResources([]);
      // setNextCursor(undefined);
    } finally {
      setIsLoadingList(false);
    }
  }, [makeRequest, serverName]);

  const readResource = useCallback(async (uri: string) => {
    if (!uri) return;
    setIsLoadingContent(true);
    setError(null); // Clear previous errors
    setResourceContent(null); // Clear previous content
    try {
      const result = await makeRequest(serverName, {
        method: "resources/read",
        params: { uri },
      });
      // Validate with Zod
      const validation = ReadResourceResultSchema.safeParse(result);
      if (!validation.success) {
        throw new Error(`Invalid response format: ${validation.error.message}`);
      }
      setResourceContent(validation.data); // Store the whole result object
    } catch (err: any) {
      const errorMsg = `Failed to read resource ${uri}: ${err.message ?? String(err)}`;
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoadingContent(false);
    }
  }, [makeRequest, serverName]);

  useEffect(() => {
    // Fetch initial list when component mounts or server changes
    listResources();
    // Reset selection when server changes
    setSelectedResource(null);
    setResourceContent(null);
    setError(null);
  }, [serverName, listResources]);

  const handleSelectItem = (resource: Resource) => {
    setSelectedResource(resource);
    readResource(resource.uri);
  }

  const handleRefresh = () => {
    // Reset list and fetch again
    setResources([]);
    setNextCursor(undefined);
    setSelectedResource(null);
    setResourceContent(null);
    listResources();
  }

  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      <div className="col-span-1 h-full">
        <ListPane
          title="Resources"
          items={resources}
          selectedItemName={selectedResource?.name ?? null}
          onSelectItem={handleSelectItem}
          onRefresh={handleRefresh}
          isLoading={isLoadingList}
          onListMore={nextCursor ? () => listResources(nextCursor) : undefined}
          isListMoreDisabled={!nextCursor}
        />
      </div>
      <div className="col-span-2 border rounded-lg p-4 overflow-auto">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {selectedResource && (
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold truncate" title={selectedResource.uri}>{selectedResource.name}</h4>
            <Button variant="outline" size="sm" onClick={() => readResource(selectedResource.uri)} disabled={isLoadingContent}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingContent ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            {/* Add Subscribe/Unsubscribe buttons here if implementing */}
          </div>
        )}
        {isLoadingContent && <p className="text-muted-foreground">Loading content...</p>}
        {!selectedResource && !isLoadingContent && !error && (
          <p className="text-muted-foreground">Select a resource to view its content.</p>
        )}
        {resourceContent !== null && <JsonView data={resourceContent} />}
      </div>
    </div>
  );
}