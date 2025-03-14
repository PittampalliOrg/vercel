import { type NextRequest, NextResponse } from "next/server"
import { fetchTraces, clickhouseClient } from "@/lib/clickhouse"

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

interface CountResult {
  total: number
}


// function getClient() {
//   if (!clickhouseClient) {
//     // Check if environment variables are set
//     if (!process.env.CLICKHOUSE_LOCAL_ENDPOINT || !process.env.CLICKHOUSE_LOCAL_PASSWORD) {
//       throw new Error("ClickHouse environment variables are not set")
//     }

//     const client = createClient({
//       url: process.env.CLICKHOUSE_LOCAL_ENDPOINT,
//       username: process.env.CLICKHOUSE_LOCAL_USERNAME,
//       password: process.env.CLICKHOUSE_LOCAL_PASSWORD,
//       request_timeout: 30000,
//     })
//   }
//   return clickhouseClient
// }

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

  // Extract filters
  const filters: Record<string, string> = {}
  for (const [key, value] of searchParams.entries()) {
    if (!["page", "pageSize", "sort", "_t"].includes(key)) {
      filters[key] = value
    }
  }

  try {
    // For debugging - return mock data if ClickHouse is not configured
    if (!process.env.CLICKHOUSE_LOCAL_ENDPOINT || !process.env.CLICKHOUSE_LOCAL_PASSWORD) {
      console.log("Using mock data because ClickHouse is not configured")
      return NextResponse.json(
        {
          data: Array(10)
            .fill(0)
            .map((_, i) => ({
              Timestamp: new Date().toISOString(),
              TraceId: `trace-${i}`,
              SpanId: `span-${i}`,
              SpanName: `Span ${i}`,
              SpanKind: "SERVER",
              ServiceName: `service-${i % 3}`,
              Duration: Math.floor(Math.random() * 1000),
              StatusCode: i % 5 === 0 ? "ERROR" : "OK",
              StatusMessage: "",
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

    // Use the imported fetchTraces function from the class
    const { data, count } = await fetchTraces({ page, pageSize, sort, filters })

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
    console.error("Error querying ClickHouse:", error)

    // Return a more detailed error message
    return NextResponse.json(
      {
        error: "Failed to fetch traces from ClickHouse",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

