// src/app/(mcp)/components/mcp-ping-tab.tsx
"use client";

import { useState } from "react";
import { useMCPConnections } from "./mcp-connection-provider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BellRing } from "lucide-react";

interface McpPingTabProps {
  serverName: string;
}

export function McpPingTab({ serverName }: McpPingTabProps) {
  const { makeRequest } = useMCPConnections();
  const [isPinging, setIsPinging] = useState(false);
  const [lastResult, setLastResult] = useState<'success' | 'error' | null>(null);
  const [lastDuration, setLastDuration] = useState<number | null>(null);

  const handlePing = async () => {
    setIsPinging(true);
    setLastResult(null);
    setLastDuration(null);
    const startTime = performance.now();
    try {
      await makeRequest(serverName, { method: "ping", params: {} });
      const duration = performance.now() - startTime;
      setLastDuration(duration);
      setLastResult('success');
      toast.success(`Pong received from ${serverName} (${duration.toFixed(0)}ms)`);
    } catch (err: any) {
      setLastResult('error');
      toast.error(`Ping failed for ${serverName}: ${err.message ?? String(err)}`);
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-10 space-y-4">
      <Button onClick={handlePing} disabled={isPinging} size="lg">
        <BellRing className={`mr-2 h-5 w-5 ${isPinging ? 'animate-bounce' : ''}`} />
        {isPinging ? "Pinging..." : "Send Ping"}
      </Button>
      {lastResult === 'success' && lastDuration !== null && (
        <p className="text-sm text-green-600">Success! ({lastDuration.toFixed(0)}ms)</p>
      )}
      {lastResult === 'error' && (
        <p className="text-sm text-red-600">Ping failed.</p>
      )}
    </div>
  );
}