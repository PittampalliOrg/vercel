// src/app/(mcp)/mcp-test/page.tsx
'use client';

import React from 'react';
import { useMCPServers } from '@/components/providers/mcp-servers-provider';
import { McpConnectionManagerProvider, useMcpConnectionManager } from '@/lib/contexts/McpConnectionManagerContext';
import { McpConnectionState, McpConnectionStateType } from '@/lib/mcp/multi-connection-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader, Play, StopCircle, RefreshCw, AlertTriangle, Terminal, Globe, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ServerConfig } from '@/lib/mcp/config';

// Component to display and manage a single server
function ServerCard({ serverName, config }: { serverName: string; config: ServerConfig }) {
    const { serverStates, connectToServer, disconnectFromServer, getToolsForServer } = useMcpConnectionManager();
    const state = serverStates[serverName] ?? { status: { state: McpConnectionStateType.Stopped }, tools: [], capabilities: null };
    const tools = state.tools; // Or use getToolsForServer(serverName)

    const isStarting = state.status.state === McpConnectionStateType.Starting;
    const isRunning = state.status.state === McpConnectionStateType.Running;
    const isStopped = state.status.state === McpConnectionStateType.Stopped;
    const isError = state.status.state === McpConnectionStateType.Error;
    const canStart = McpConnectionState.canBeStarted(state.status);
    const canStop = isRunning || isStarting;

    const handleConnect = async () => {
        await connectToServer(config);
    };

    const handleDisconnect = async () => {
        await disconnectFromServer(serverName);
    };

    const getStatusBadgeVariant = (): "default" | "secondary" | "destructive" | "outline" | "success" => {
        switch (state.status.state) {
            case McpConnectionStateType.Running: return "success";
            case McpConnectionStateType.Starting: return "secondary";
            case McpConnectionStateType.Error: return "destructive";
            case McpConnectionStateType.Stopped: return "outline";
            default: return "outline";
        }
    };

    const getStatusIcon = () => {
        switch (state.status.state) {
            case McpConnectionStateType.Running: return <div className="h-2 w-2 rounded-full bg-green-500" />;
            case McpConnectionStateType.Starting: return <Loader className="h-3 w-3 animate-spin text-yellow-500" />;
            case McpConnectionStateType.Error: return <AlertTriangle className="h-3 w-3 text-red-500" />;
            case McpConnectionStateType.Stopped: return <div className="h-2 w-2 rounded-full bg-gray-400" />;
            default: return null;
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg">{serverName}</CardTitle>
                        <CardDescription className="flex items-center gap-1 text-xs">
                            {config.transport === 'stdio' ? <Terminal size={12} /> : <Globe size={12} />}
                            {config.transport}
                        </CardDescription>
                    </div>
                    <Badge variant={getStatusBadgeVariant()} className="flex items-center gap-1.5">
                        {getStatusIcon()}
                        {McpConnectionState.toString(state.status)}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                 <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="details">
                         <AccordionTrigger className="text-sm">Details</AccordionTrigger>
                         <AccordionContent className="text-xs text-muted-foreground space-y-1 pt-2">
                            {config.transport === 'stdio' ? (
                                <>
                                    <p>Cmd: <code className="bg-muted px-1 rounded">{config.command}</code></p>
                                    <p>Args: <code className="bg-muted px-1 rounded">{config.args?.join(' ') || '<none>'}</code></p>
                                </>
                            ) : (
                                <p>URL: <code className="bg-muted px-1 rounded">{config.url}</code></p>
                            )}
                            {isError && state.status.state === McpConnectionStateType.Error && (
                                <p className="text-red-600 dark:text-red-400">Error: {state.status.message}</p>
                            )}
                         </AccordionContent>
                    </AccordionItem>
                    {isRunning && tools.length > 0 && (
                         <AccordionItem value="tools">
                              <AccordionTrigger className="text-sm">Tools ({tools.length})</AccordionTrigger>
                              <AccordionContent className="text-xs pt-2">
                                <ScrollArea className="h-[100px] pr-3">
                                   <ul className="space-y-1">
                                      {tools.map(tool => (
                                          <li key={tool.name} className="text-muted-foreground truncate" title={tool.description}>
                                                <Info size={10} className="inline mr-1" /> {tool.name}
                                          </li>
                                      ))}
                                   </ul>
                                </ScrollArea>
                              </AccordionContent>
                         </AccordionItem>
                    )}
                 </Accordion>

            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={!canStop}
                >
                    <StopCircle className="mr-1 h-4 w-4" /> Disconnect
                </Button>
                <Button
                    variant="default"
                    size="sm"
                    onClick={handleConnect}
                    disabled={!canStart || isStarting}
                >
                    {isError ? <RefreshCw className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
                    {isError ? 'Retry' : 'Connect'}
                </Button>
            </CardFooter>
        </Card>
    );
}


// Main Page Component
function McpTestPageContent() {
    const { serverConfigs } = useMCPServers(); // Get configurations
    const sortedServerNames = Object.keys(serverConfigs).sort();

    return (
        <div className="container mx-auto p-4 md:p-6">
            <h1 className="text-2xl font-semibold mb-4">MCP Connection Test Page</h1>
            <p className="text-muted-foreground mb-6">
                This page allows testing individual MCP server connections managed by `McpConnectionManagerContext`.
                Connect/disconnect servers below and view their status and discovered tools.
            </p>

            {sortedServerNames.length === 0 ? (
                <p className="text-center text-muted-foreground mt-8">
                    No MCP server configurations found. Please add configurations via the main chat UI's MCP Server button.
                </p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedServerNames.map(name => (
                        <ServerCard key={name} serverName={name} config={serverConfigs[name]} />
                    ))}
                </div>
            )}
        </div>
    );
}

// Wrap the content with necessary providers
export default function McpTestPage() {
    return (
        // MCPServersProvider is likely already in your layout.tsx or similar top-level component.
        // If not, you might need it here or higher up the tree.
        // <MCPServersProvider>
        <McpConnectionManagerProvider>
            <McpTestPageContent />
        </McpConnectionManagerProvider>
        // </MCPServersProvider>
    );
}