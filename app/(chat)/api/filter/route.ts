import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@clickhouse/client"

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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const column = searchParams.get("column")

  if (!column) {
    return NextResponse.json({ error: "Column parameter is required" }, { status: 400 })
  }

  try {
    const client = getClient()

    const query = `
      SELECT DISTINCT ${column}
      FROM default.traces
      WHERE ${column} IS NOT NULL AND ${column} != ''
      ORDER BY ${column} ASC
      LIMIT 100
    `

    const result = await client.query({
      query,
      format: "JSONEachRow",
    })

    // Use a type assertion with a generic Record type
    const data = await result.json<Record<string, any>[]>()

    // Use a type guard to ensure column exists on each item
    return NextResponse.json(
      data
        .map((item) => {
          // Check if the column exists on the item
          if (column && column in item) {
            return item[column as keyof typeof item]
          }
          return null
        })
        .filter(Boolean), // Remove any null values
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    )
  } catch (error) {
    console.error(`Error fetching filter options for ${column}:`, error)
    return NextResponse.json({ error: `Failed to fetch filter options for ${column}` }, { status: 500 })
  }
}

