import { type NextRequest, NextResponse } from "next/server"
import { fetchLogs } from "@/lib/clickhouse-logs"

export async function GET(request: NextRequest) {
  // Get query parameters
  const searchParams = request.nextUrl.searchParams
  const page = Number(searchParams.get("page") || "1")
  let pageSize = Number(searchParams.get("pageSize") || "10")

  // Ensure pageSize doesn't exceed a reasonable limit
  if (pageSize > 100) {
    pageSize = 100
  }
  const sort = searchParams.get("sort") || ""

  // Get lookback parameter
  const lookback = searchParams.get("lookback") || "1h"

  // Extract filters
  const filters: Record<string, string> = {}
  for (const [key, value] of searchParams.entries()) {
    if (!["page", "pageSize", "sort", "_t", "lookback"].includes(key)) {
      filters[key] = value
    }
  }

  try {
    // For debugging - return mock data if ClickHouse is not configured
    if (!process.env.CLICKHOUSE_CLOUD_ENDPOINT || !process.env.CLICKHOUSE_CLOUD_PASSWORD) {
      console.log("Using mock data because ClickHouse is not configured")
      return NextResponse.json(
        {
          data: Array(10)
            .fill(0)
            .map((_, i) => ({
              Timestamp: new Date().toISOString(),
              TimestampTime: new Date().toISOString(),
              TraceId: `trace-${i}`,
              SpanId: `span-${i}`,
              TraceFlags: 1,
              SeverityText: i % 5 === 0 ? "ERROR" : i % 3 === 0 ? "WARN" : "INFO",
              SeverityNumber: i % 5 === 0 ? 17 : i % 3 === 0 ? 13 : 9,
              ServiceName: `service-${i % 3}`,
              Body: `This is a sample log message ${i}`,
              ResourceSchemaUrl: "",
              ResourceAttributes: { "service.name": `service-${i % 3}` },
              ScopeSchemaUrl: "",
              ScopeName: "logger",
              ScopeVersion: "1.0.0",
              ScopeAttributes: {},
              LogAttributes: { "event.name": `event-${i}` },
            })),
          count: 100,
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

    console.log("API: Fetching logs with lookback:", lookback)
    console.log("API: Filters:", filters)

    // Use the imported fetchLogs function
    const { data, count } = await fetchLogs({ page, pageSize, sort, filters, lookback })

    console.log(`API: Returning ${data.length} logs with total count ${count}`)

    // Return the results
    return NextResponse.json(
      {
        data,
        count,
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
    console.error("Error querying ClickHouse for logs:", error)

    // Return a more detailed error message
    return NextResponse.json(
      {
        error: "Failed to fetch logs from ClickHouse",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

