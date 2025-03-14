"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getLogDetail } from "@/lib/logs-api"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface LogDetailProps {
  timestamp: string
}

export function LogDetail({ timestamp }: LogDetailProps) {
  const [log, setLog] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchLogDetail() {
      try {
        setLoading(true)
        const data = await getLogDetail(timestamp)
        setLog(data)
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch log details"))
        console.error("Error fetching log details:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchLogDetail()
  }, [timestamp])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading log details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load log details: {error.message}</AlertDescription>
      </Alert>
    )
  }

  if (!log) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Not Found</AlertTitle>
        <AlertDescription>Log with timestamp {timestamp} was not found.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Timestamp</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{new Date(log.TimestampTime).toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Service</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{log.ServiceName}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={
                log.SeverityText === "ERROR"
                  ? "destructive"
                  : log.SeverityText === "WARN"
                    ? "secondary"
                    : log.SeverityText === "INFO"
                      ? "secondary"
                      : "outline"
              }
              className={`text-lg ${log.SeverityText === "WARN" ? "bg-yellow-500 hover:bg-yellow-500/80" : ""}`}
            >
              {log.SeverityText}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Trace</CardTitle>
          </CardHeader>
          <CardContent>
            {log.TraceId ? (
              <Link href={`/traces/${log.TraceId}`} className="text-lg font-bold text-blue-500 hover:underline">
                View Trace
              </Link>
            ) : (
              <div className="text-lg text-muted-foreground">No trace</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Log Message</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap bg-muted p-4 rounded-md overflow-auto max-h-[200px]">{log.Body}</pre>
        </CardContent>
      </Card>

      <Tabs defaultValue="attributes">
        <TabsList>
          <TabsTrigger value="attributes">Log Attributes</TabsTrigger>
          <TabsTrigger value="resource">Resource Attributes</TabsTrigger>
          <TabsTrigger value="scope">Scope Attributes</TabsTrigger>
        </TabsList>
        <TabsContent value="attributes" className="p-4 border rounded-md mt-2">
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(log.LogAttributes || {}).length > 0 ? (
              Object.entries(log.LogAttributes || {}).map(([key, value]) => (
                <div key={key} className="flex flex-col">
                  <span className="text-sm font-medium">{key}</span>
                  <span className="text-sm text-muted-foreground">{String(value)}</span>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center py-4 text-muted-foreground">No log attributes available</div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="resource" className="p-4 border rounded-md mt-2">
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(log.ResourceAttributes || {}).length > 0 ? (
              Object.entries(log.ResourceAttributes || {}).map(([key, value]) => (
                <div key={key} className="flex flex-col">
                  <span className="text-sm font-medium">{key}</span>
                  <span className="text-sm text-muted-foreground">{String(value)}</span>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center py-4 text-muted-foreground">No resource attributes available</div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="scope" className="p-4 border rounded-md mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <span className="text-sm font-medium">Scope Name</span>
              <span className="text-sm text-muted-foreground">{log.ScopeName || "N/A"}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Scope Version</span>
              <span className="text-sm text-muted-foreground">{log.ScopeVersion || "N/A"}</span>
            </div>
            {Object.entries(log.ScopeAttributes || {}).length > 0 ? (
              Object.entries(log.ScopeAttributes || {}).map(([key, value]) => (
                <div key={key} className="flex flex-col">
                  <span className="text-sm font-medium">{key}</span>
                  <span className="text-sm text-muted-foreground">{String(value)}</span>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center py-4 text-muted-foreground">No scope attributes available</div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

