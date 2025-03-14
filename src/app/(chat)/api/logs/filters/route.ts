import { type NextRequest, NextResponse } from "next/server"
import { fetchFilterOptions } from "@/lib/clickhouse-logs"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const column = searchParams.get("column")

  if (!column) {
    return NextResponse.json({ error: "Column parameter is required" }, { status: 400 })
  }

  try {
    // For debugging - return mock data if ClickHouse is not configured
    if (!process.env.CLICKHOUSE_CLOUD_ENDPOINT || !process.env.CLICKHOUSE_CLOUD_PASSWORD) {
      console.log("Using mock data because ClickHouse is not configured")

      // Return mock filter options based on the column
      if (column === "ServiceName") {
        return NextResponse.json(["service-1", "service-2", "service-3"], {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        })
      } else if (column === "SeverityText") {
        return NextResponse.json(["INFO", "WARN", "ERROR", "DEBUG"], {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        })
      } else {
        return NextResponse.json([], {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        })
      }
    }

    // Use the imported fetchFilterOptions function
    const options = await fetchFilterOptions(column)

    return NextResponse.json(options, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
  } catch (error) {
    console.error(`Error fetching filter options for ${column}:`, error)

    // Return a more detailed error message
    return NextResponse.json(
      {
        error: `Failed to fetch filter options for ${column}`,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

