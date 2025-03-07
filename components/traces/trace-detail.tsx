"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDuration } from "@/lib/utils"
import { getTraceDetail } from "@/lib/api"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Define interfaces for the trace data
interface TraceSpan {
  spanId: string
  parentSpanId?: string
  name: string
  kind: string
  serviceName: string
  startTime: number
  duration: number
  status: string
  attributes: Record<string, any>
}

interface TraceEvent {
  name: string
  timestamp: string
  attributes: Record<string, any>
  spanId: string
}

interface TraceData {
  traceId: string
  timestamp: string
  duration: number
  serviceName: string
  status: string
  resourceAttributes: Record<string, any>
  spanAttributes: Record<string, any>
  events: TraceEvent[]
  spans: TraceSpan[]
  startTime: number
}

interface TraceDetailProps {
  traceId: string
}

export function TraceDetail({ traceId }: TraceDetailProps) {
  const [trace, setTrace] = useState<TraceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchTraceDetail() {
      try {
        setLoading(true)
        const data = await getTraceDetail(traceId)
        setTrace(data as TraceData)
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch trace details"))
        console.error("Error fetching trace details:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchTraceDetail()
  }, [traceId])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading trace details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load trace details: {error.message}</AlertDescription>
      </Alert>
    )
  }

  if (!trace) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Not Found</AlertTitle>
        <AlertDescription>Trace with ID {traceId} was not found.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(trace.duration)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Service</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trace.serviceName}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div
                className={`h-3 w-3 rounded-full mr-2 ${
                  trace.status === "OK" ? "bg-green-500" : trace.status === "ERROR" ? "bg-red-500" : "bg-yellow-500"
                }`}
              />
              <span className="text-2xl font-bold">{trace.status}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Timestamp</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Date(trace.timestamp).toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="spans">Spans</TabsTrigger>
          <TabsTrigger value="attributes">Attributes</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>
        <TabsContent value="timeline" className="p-4 border rounded-md mt-2">
          <div className="relative">
            {trace.spans.map((span: TraceSpan, index: number) => (
              <div key={index} className="flex items-start mb-4">
                <div className="w-40 text-sm text-muted-foreground pt-1">{formatDuration(span.duration)}</div>
                <div
                  className="flex-1 h-8 rounded-md relative"
                  style={{
                    marginLeft: `${(span.startTime / trace.duration) * 100}%`,
                    width: `${(span.duration / trace.duration) * 100}%`,
                    backgroundColor: getSpanColor(span.serviceName),
                    minWidth: "2px", // Ensure very short spans are still visible
                  }}
                >
                  <div className="absolute inset-0 flex items-center px-2 text-xs text-white truncate">{span.name}</div>
                </div>
              </div>
            ))}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
          </div>
        </TabsContent>
        <TabsContent value="spans" className="p-4 border rounded-md mt-2">
          <div className="space-y-4">
            {trace.spans.map((span: TraceSpan, index: number) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">{span.name}</CardTitle>
                  <CardDescription>
                    Service: {span.serviceName} • Duration: {formatDuration(span.duration)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Span ID:</span> {span.spanId}
                    </div>
                    <div>
                      <span className="font-medium">Parent Span ID:</span> {span.parentSpanId || "None"}
                    </div>
                    <div>
                      <span className="font-medium">Kind:</span> {span.kind}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span> {span.status}
                    </div>
                  </div>
                  {Object.keys(span.attributes || {}).length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Span Attributes</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(span.attributes || {}).map(([key, value]) => (
                          <div key={key} className="flex flex-col">
                            <span className="text-xs font-medium">{key}</span>
                            <span className="text-xs text-muted-foreground">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="attributes" className="p-4 border rounded-md mt-2">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Resource Attributes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(trace.resourceAttributes || {}).map(([key, value]) => (
                    <div key={key} className="flex flex-col">
                      <span className="text-sm font-medium">{key}</span>
                      <span className="text-sm text-muted-foreground">{String(value)}</span>
                    </div>
                  ))}
                  {Object.keys(trace.resourceAttributes || {}).length === 0 && (
                    <div className="col-span-2 text-center py-4 text-muted-foreground">
                      No resource attributes available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Span Attributes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(trace.spanAttributes || {}).map(([key, value]) => (
                    <div key={key} className="flex flex-col">
                      <span className="text-sm font-medium">{key}</span>
                      <span className="text-sm text-muted-foreground">{String(value)}</span>
                    </div>
                  ))}
                  {Object.keys(trace.spanAttributes || {}).length === 0 && (
                    <div className="col-span-2 text-center py-4 text-muted-foreground">
                      No span attributes available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="events" className="p-4 border rounded-md mt-2">
          <div className="space-y-4">
            {(trace.events || []).map((event: TraceEvent, index: number) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">{event.name}</CardTitle>
                  <CardDescription>{new Date(event.timestamp).toLocaleString()}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(event.attributes || {}).map(([key, value]) => (
                      <div key={key} className="flex flex-col">
                        <span className="text-sm font-medium">{key}</span>
                        <span className="text-sm text-muted-foreground">{String(value)}</span>
                      </div>
                    ))}
                    {Object.keys(event.attributes || {}).length === 0 && (
                      <div className="col-span-2 text-center py-4 text-muted-foreground">
                        No event attributes available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!trace.events || trace.events.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">No events recorded for this trace</div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function getSpanColor(serviceName: string): string {
  // Generate a deterministic color based on service name
  const colors = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#f97316", // orange
  ]

  let hash = 0
  for (let i = 0; i < serviceName.length; i++) {
    hash = serviceName.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

