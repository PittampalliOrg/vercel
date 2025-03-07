import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@clickhouse/client"
import { fetchTraceDetail } from "@/lib/clickhouse"

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
    // Check if environment variables are set
    if (!process.env.CLICKHOUSE_LOCAL_ENDPOINT || !process.env.CLICKHOUSE_LOCAL_PASSWORD) {
      throw new Error("ClickHouse environment variables are not set")
    }

    const client = createClient({
      url: process.env.CLICKHOUSE_LOCAL_ENDPOINT,
      username: process.env.CLICKHOUSE_LOCAL_USERNAME,
      password: process.env.CLICKHOUSE_LOCAL_PASSWORD,
      request_timeout: 30000,
    })
  }
  return clientInstance
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ traceId: string }> }
) {
  const traceId = (await params).traceId

  try {
    // For debugging - return mock data if ClickHouse is not configured
    if (!process.env.CLICKHOUSE_LOCAL_ENDPOINT || !process.env.CLICKHOUSE_LOCAL_PASSWORD) {
      console.log("Using mock data because ClickHouse is not configured")

      const now = Date.now()
      const mockSpans = Array(5)
        .fill(0)
        .map((_, i) => ({
          spanId: `span-${i}`,
          parentSpanId: i > 0 ? `span-${i - 1}` : undefined,
          name: `Span ${i}`,
          kind: "SERVER",
          serviceName: `service-${i % 3}`,
          startTime: i * 100,
          duration: Math.floor(Math.random() * 1000),
          status: i % 5 === 0 ? "ERROR" : "OK",
          attributes: {},
        }))

      return NextResponse.json(
        {
          traceId,
          timestamp: new Date().toISOString(),
          duration: 1500,
          serviceName: "mock-service",
          status: "OK",
          resourceAttributes: {},
          spanAttributes: {},
          events: [],
          spans: mockSpans,
          startTime: now,
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        },
      )
    }

    // Use the imported fetchTraceDetail function from the class
    const traceDetail = await fetchTraceDetail(traceId)

    return NextResponse.json(traceDetail, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("Error querying ClickHouse for trace details:", error)

    // Return a more detailed error message
    return NextResponse.json(
      {
        error: "Failed to fetch trace details from ClickHouse",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

