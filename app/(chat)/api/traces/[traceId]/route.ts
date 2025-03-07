import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@clickhouse/client"

// Define interfaces for the data types
interface TraceSpan {
  Timestamp: string
  TraceId: string
  SpanId: string
  ParentSpanId?: string
  SpanName: string
  SpanKind: string
  ServiceName: string
  Duration: number
  StatusCode: string
  StatusMessage: string
  ResourceAttributes?: Record<string, any>
  SpanAttributes?: Record<string, any>
  EventTimestamps?: string[]
  EventNames?: string[]
  EventAttributes?: Record<string, any>[]
}

interface TraceEvent {
  name: string
  timestamp: string
  attributes: Record<string, any>
  spanId: string
}

interface ProcessedSpan {
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

// Create a singleton client instance
let clientInstance: ReturnType<typeof createClient> | null = null

function getClient() {
  if (!clientInstance) {
    clientInstance = createClient({
      host: process.env.CLICKHOUSE_CLOUD_ENDPOINT!,
      password: process.env.CLICKHOUSE_CLOUD_PASSWORD!,
      request_timeout: 30000,
    })
  }
  return clientInstance
}

export async function GET(request: NextRequest, { params }: { params: { traceId: string } }) {
  const traceId = params.traceId

  try {
    const client = getClient()

    // Get the root span for this trace
    const rootSpanQuery = `
      SELECT 
        Timestamp,
        TraceId,
        SpanId,
        SpanName,
        SpanKind,
        ServiceName,
        Duration,
        StatusCode,
        StatusMessage,
        ResourceAttributes,
        SpanAttributes
      FROM default.traces
      WHERE TraceId = {traceId:String} AND (ParentSpanId = '' OR ParentSpanId IS NULL)
      LIMIT 1
    `

    const rootSpanResult = await client.query({
      query: rootSpanQuery,
      query_params: { traceId },
      format: "JSONEachRow",
    })

    const rootSpanData = await rootSpanResult.json<TraceSpan>()

    if (!rootSpanData.length) {
      return NextResponse.json({ error: `Trace with ID ${traceId} not found` }, { status: 404 })
    }

    const rootSpan = rootSpanData[0]

    // Get all spans for this trace
    const spansQuery = `
      SELECT 
        Timestamp,
        TraceId,
        SpanId,
        ParentSpanId,
        SpanName,
        SpanKind,
        ServiceName,
        Duration,
        StatusCode,
        StatusMessage,
        SpanAttributes,
        Events.Timestamp as EventTimestamps,
        Events.Name as EventNames,
        Events.Attributes as EventAttributes
      FROM default.traces
      WHERE TraceId = {traceId:String}
      ORDER BY Timestamp ASC
    `

    const spansResult = await client.query({
      query: spansQuery,
      query_params: { traceId },
      format: "JSONEachRow",
    })

    const spansData = await spansResult.json<TraceSpan>()

    // Process events from the spans
    const events: TraceEvent[] = []
    for (const span of spansData) {
      if (span.EventTimestamps && span.EventNames) {
        for (let i = 0; i < span.EventTimestamps.length; i++) {
          events.push({
            name: span.EventNames[i],
            timestamp: span.EventTimestamps[i],
            attributes: span.EventAttributes?.[i] || {},
            spanId: span.SpanId,
          })
        }
      }
    }

    // Calculate the start time (earliest timestamp)
    const startTime = Math.min(...spansData.map((span) => new Date(span.Timestamp).getTime()))

    // Process spans for timeline view
    const spans: ProcessedSpan[] = spansData.map((span) => ({
      spanId: span.SpanId,
      parentSpanId: span.ParentSpanId,
      name: span.SpanName,
      kind: span.SpanKind,
      serviceName: span.ServiceName,
      startTime: new Date(span.Timestamp).getTime() - startTime, // Relative to trace start
      duration: span.Duration,
      status: span.StatusCode,
      attributes: span.SpanAttributes || {},
    }))

    return NextResponse.json(
      {
        traceId,
        timestamp: rootSpan.Timestamp,
        duration: rootSpan.Duration,
        serviceName: rootSpan.ServiceName,
        status: rootSpan.StatusCode,
        resourceAttributes: rootSpan.ResourceAttributes || {},
        spanAttributes: rootSpan.SpanAttributes || {},
        events,
        spans,
        startTime,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    )
  } catch (error) {
    console.error("Error querying ClickHouse for trace details:", error)
    return NextResponse.json({ error: "Failed to fetch trace details from ClickHouse" }, { status: 500 })
  }
}

