import { type NextRequest, NextResponse } from "next/server"
import { fetchLogDetail } from "@/lib/clickhouse-logs"

export async function GET(request: NextRequest, context: { params: { timestamp: string } }) {
  const timestamp = decodeURIComponent(context.params.timestamp)

  try {
    // For debugging - return mock data if ClickHouse is not configured
    if (!process.env.CLICKHOUSE_CLOUD_ENDPOINT || !process.env.CLICKHOUSE_CLOUD_PASSWORD) {
      console.log("Using mock data because ClickHouse is not configured")

      return NextResponse.json(
        {
          Timestamp: timestamp,
          TimestampTime: new Date().toISOString(),
          TraceId: "trace-123",
          SpanId: "span-456",
          TraceFlags: 1,
          SeverityText: "INFO",
          SeverityNumber: 9,
          ServiceName: "mock-service",
          Body: "This is a sample log message",
          ResourceSchemaUrl: "",
          ResourceAttributes: { "service.name": "mock-service" },
          ScopeSchemaUrl: "",
          ScopeName: "logger",
          ScopeVersion: "1.0.0",
          ScopeAttributes: {},
          LogAttributes: { "event.name": "sample-event" },
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

    // Use the imported fetchLogDetail function
    const logDetail = await fetchLogDetail(timestamp)

    return NextResponse.json(logDetail, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error("Error querying ClickHouse for log details:", error)

    // Return a more detailed error message
    return NextResponse.json(
      {
        error: "Failed to fetch log details from ClickHouse",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

