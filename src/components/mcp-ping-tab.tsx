// src/app/(mcp)/components/mcp-ping-tab.tsx
"use client";

import { useState } from "react";
import { useMCPConnections } from "@/components/mcp-connection-provider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BellRing, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface McpPingTabProps {
  serverName: string;
}

export function McpPingTab({ serverName }: McpPingTabProps) {
  const { makeRequest } = useMCPConnections();
  const [isPinging, setIsPinging] = useState(false);
  const [lastResult, setLastResult] = useState<'success' | 'error' | null>(null);
  const [lastDuration, setLastDuration] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePing = async () => {
    setIsPinging(true);
    setLastResult(null);
    setLastDuration(null);
    setError(null); // Clear previous errors
    const startTime = performance.now();
    try {
      // The ping method might not return anything significant on success
      // Use an empty schema or just expect success/failure
      await makeRequest(serverName, { method: "ping", params: {} });
      const duration = performance.now() - startTime;
      setLastDuration(duration);
      setLastResult('success');
      toast.success(`Pong received from ${serverName} (${duration.toFixed(0)}ms)`);
    } catch (err: any) {
      const errorMsg = `Ping failed for ${serverName}: ${err.message ?? String(err)}`;
      setError(errorMsg);
      setLastResult('error');
      toast.error(errorMsg);
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-10 space-y-4">
      <Button onClick={handlePing} disabled={isPinging} size="lg">
        {isPinging ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <BellRing className="mr-2 h-5 w-5" />}
        {isPinging ? "Pinging..." : "Send Ping"}
      </Button>
      <div className="h-6"> {/* Placeholder for status message */}
        {lastResult === 'success' && lastDuration !== null && (
            <p className="text-sm text-green-600 dark:text-green-400">Success! ({lastDuration.toFixed(0)}ms)</p>
          )}
      </div>
      {lastResult === 'error' && error && (
         <Alert variant="destructive" className="mt-4 max-w-md">
             <AlertCircle className="h-4 w-4" />
             <AlertTitle>Ping Error</AlertTitle>
             <AlertDescription>{error}</AlertDescription>
         </Alert>
      )}
    </div>
  );
}