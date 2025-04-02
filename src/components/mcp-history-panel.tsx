// src/app/(mcp)/components/mcp-history-panel.tsx
"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConnectionState } from "@/lib/mcp/types";
import { format } from 'date-fns';
// Placeholder for JsonView component (adapt from inspector or use a library)
const JsonView = ({ data }: { data: any }) => <pre className="text-xs p-2 bg-muted rounded overflow-auto">{JSON.stringify(data, null, 2)}</pre>;

interface McpHistoryPanelProps {
  serverName: string;
  connectionState: ConnectionState;
  onClearHistory: (serverName: string) => void;
}

export function McpHistoryPanel({ serverName, connectionState, onClearHistory }: McpHistoryPanelProps) {
  const { history, notifications, stderr } = connectionState;

  return (
    <div className="h-full flex flex-col p-2 border-t">
      <Tabs defaultValue="history" className="flex-1 flex flex-col overflow-hidden">
        <div className="flex justify-between items-center mb-2 px-2">
          <TabsList>
            <TabsTrigger value="history">History ({history.length})</TabsTrigger>
            <TabsTrigger value="notifications">Notifications ({notifications.length})</TabsTrigger>
            <TabsTrigger value="stderr" disabled={stderr.length === 0}>Stderr ({stderr.length})</TabsTrigger>
          </TabsList>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onClearHistory(serverName)}
            disabled={history.length === 0 && notifications.length === 0 && stderr.length === 0}
          >
            Clear
          </Button>
        </div>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-2">
            <TabsContent value="history" className="mt-0 space-y-2 text-xs">
              {[...history].reverse().map((item, index) => (
                <details key={`${item.id}-${index}`} className="p-2 border rounded bg-secondary/30">
                  <summary className="cursor-pointer font-mono truncate">
                    <span className="text-muted-foreground">{format(item.timestamp, 'HH:mm:ss.SSS')}</span>{' '}
                    <span className="text-blue-600 dark:text-blue-400">REQ</span>{' '}
                    [{item.id}] {item.request?.method ?? 'Notification'}
                    {item.responseTimestamp && (
                      <span className="text-green-600 dark:text-green-400 ml-2">RES</span>
                    )}
                    {item.error && (
                      <span className="text-red-600 dark:text-red-400 ml-2">ERR</span>
                    )}
                  </summary>
                  <div className="mt-2 space-y-1">
                    <strong className="text-blue-600 dark:text-blue-400">Request:</strong>
                    <JsonView data={item.request} />
                    {item.response && (
                      <>
                        <strong className="text-green-600 dark:text-green-400">Response ({format(item.responseTimestamp!, 'HH:mm:ss.SSS')}):</strong>
                        <JsonView data={item.response} />
                      </>
                    )}
                    {item.error && (
                      <>
                        <strong className="text-red-600 dark:text-red-400">Error:</strong>
                        <pre className="text-xs p-2 bg-destructive/10 rounded">{item.error}</pre>
                      </>
                    )}
                  </div>
                </details>
              ))}
            </TabsContent>
            <TabsContent value="notifications" className="mt-0 space-y-2 text-xs">
              {[...notifications].reverse().map((item, index) => (
                <details key={index} className="p-2 border rounded bg-secondary/30">
                  <summary className="cursor-pointer font-mono truncate">
                    <span className="text-muted-foreground">{format(item.timestamp, 'HH:mm:ss.SSS')}</span>{' '}
                    <span className="text-purple-600 dark:text-purple-400">NOTIF</span>{' '}
                    {item.notification.method}
                  </summary>
                  <div className="mt-2">
                    <JsonView data={item.notification} />
                  </div>
                </details>
              ))}
            </TabsContent>
            <TabsContent value="stderr" className="mt-0 space-y-1 font-mono text-xs text-red-500 dark:text-red-400">
              {stderr.map((item, index) => (
                <div key={index}>
                  <span className="text-muted-foreground mr-2">{format(item.timestamp, 'HH:mm:ss.SSS')}</span>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{item.content}</span>
                </div>
              ))}
            </TabsContent>
          </ScrollArea>
        </div>

      </Tabs>
    </div>
  );
}