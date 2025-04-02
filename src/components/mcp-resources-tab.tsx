// src/app/(mcp)/components/mcp-resources-tab.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useMCPConnections } from "@/components/mcp-connection-provider";
import { ListPane } from "@/components/ui/list-pane"; // Assuming this path is correct
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { JsonView } from "@/components/ui/json-view"; // Assuming this path is correct
import { toast } from "sonner";
import { AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import {
  Resource,
  ListResourcesResultSchema,
  ReadResourceResultSchema,
  ServerCapabilities,
} from "@modelcontextprotocol/sdk/types.js";

interface McpResourcesTabProps {
  serverName: string;
  // Allow capabilities to be null initially
  capabilities: ServerCapabilities | null | undefined;
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

  const hasResourceCapability = !!capabilities?.resources;

  const listResources = useCallback(async (useCursor?: string, isRefresh = false) => {
    if (!hasResourceCapability) return; // Don't fetch if capability missing
    setIsLoadingList(true);
    if (!useCursor) { // Clear previous errors/selection on full refresh/initial load
       setError(null);
       if (isRefresh) {
         setSelectedResource(null);
         setResourceContent(null);
       }
    }
    try {
      const result = await makeRequest(serverName, {
        method: "resources/list",
        params: useCursor ? { cursor: useCursor } : {},
      });
      const validation = ListResourcesResultSchema.safeParse(result);
      if (!validation.success) {
        throw new Error(`Invalid response format: ${validation.error.message}`);
      }
      const data = validation.data;
      setResources((prev) => (useCursor && !isRefresh) ? [...prev, ...(data.resources ?? [])] : (data.resources ?? []));
      setNextCursor(data.nextCursor);
    } catch (err: any) {
      const errorMsg = `Failed to list resources: ${err.message ?? String(err)}`;
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoadingList(false);
    }
  }, [makeRequest, serverName, hasResourceCapability]); // Add capability check to dependency

  const readResource = useCallback(async (uri: string) => {
    if (!hasResourceCapability) return;
    if (!uri) return;
    setIsLoadingContent(true);
    setError(null);
    setResourceContent(null);
    try {
      const result = await makeRequest(serverName, {
        method: "resources/read",
        params: { uri },
      });
      const validation = ReadResourceResultSchema.safeParse(result);
      if (!validation.success) {
        throw new Error(`Invalid response format: ${validation.error.message}`);
      }
      setResourceContent(validation.data);
    } catch (err: any) {
      const errorMsg = `Failed to read resource ${uri}: ${err.message ?? String(err)}`;
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoadingContent(false);
    }
  }, [makeRequest, serverName, hasResourceCapability]); // Add capability check to dependency

  // Fetch initial list when component mounts or server changes if capability exists
  useEffect(() => {
    if (hasResourceCapability) {
        console.log(`[ResourcesTab] Fetching initial resources for ${serverName}`);
        listResources(undefined, true); // Pass true for initial refresh
    } else {
        console.log(`[ResourcesTab] Skipping fetch for ${serverName} - no capability.`);
        // Clear state if capability disappears
        setResources([]);
        setNextCursor(undefined);
        setSelectedResource(null);
        setResourceContent(null);
        setError(null);
    }
    // Reset selection when server changes regardless of capability
    setSelectedResource(null);
    setResourceContent(null);
    setError(null);
  }, [serverName, listResources, hasResourceCapability]);

  const handleSelectItem = (resource: Resource) => {
    setSelectedResource(resource);
    readResource(resource.uri);
  };

  const handleRefreshList = () => {
    listResources(undefined, true); // Pass true for refresh
  };

  if (!hasResourceCapability) {
     return <div className="p-4 text-muted-foreground">Resource capability not supported or unknown for this server.</div>;
  }

  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      <div className="col-span-1 h-full">
        <ListPane
          title="Resources"
          items={resources}
          selectedItemName={selectedResource?.name ?? null}
          onSelectItem={handleSelectItem}
          onRefresh={handleRefreshList}
          isLoading={isLoadingList}
          onListMore={nextCursor ? () => listResources(nextCursor) : undefined}
          isListMoreDisabled={!nextCursor}
        />
      </div>
      <div className="col-span-2 border rounded-lg p-4 overflow-auto flex flex-col"> {/* Added flex flex-col */}
        {error && !isLoadingContent && ( // Show error only if not loading content
          <Alert variant="destructive" className="mb-4 shrink-0">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {selectedResource && (
          <div className="flex justify-between items-center mb-2 shrink-0">
            <h4 className="font-semibold truncate" title={selectedResource.uri}>{selectedResource.name}</h4>
            <Button variant="outline" size="sm" onClick={() => readResource(selectedResource.uri)} disabled={isLoadingContent}>
              {isLoadingContent ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Refresh
            </Button>
            {/* TODO: Add Subscribe/Unsubscribe buttons */}
          </div>
        )}
        {/* Content Area */}
        <div className="flex-1 overflow-auto mt-2">
            {isLoadingContent && (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2"/>Loading content...
                </div>
            )}
            {!selectedResource && !isLoadingContent && !error && (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    Select a resource to view its content.
                </div>
            )}
            {resourceContent !== null && !isLoadingContent && <JsonView data={resourceContent} />}
        </div>
      </div>
    </div>
  );
}