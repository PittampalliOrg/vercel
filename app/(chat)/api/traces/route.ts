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

interface CountResult {
  total: number
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

export async function GET(request: NextRequest) {
  // Get query parameters
  const searchParams = request.nextUrl.searchParams
  const page = Number(searchParams.get("page") || "1")
  const pageSize = Number(searchParams.get("pageSize") || "10")
  const sort = searchParams.get("sort") || ""

  // Extract filters
  const filters: Record<string, string> = {}
  for (const [key, value] of searchParams.entries()) {
    if (!["page", "pageSize", "sort"].includes(key)) {
      filters[key] = value
    }
  }

  try {
    const client = getClient()

    // Build the SQL query for ClickHouse
    let query = `
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
        StatusMessage
      FROM default.traces
      WHERE 1=1
    `

    const queryParams: Record<string, any> = {}

    // Add timestamp filters
    if (filters.startDate) {
      query += ` AND Timestamp >= {startDate:DateTime64(9)}`
      queryParams.startDate = filters.startDate
    }

    if (filters.endDate) {
      query += ` AND Timestamp <= {endDate:DateTime64(9)}`
      queryParams.endDate = filters.endDate
    }

    // Add duration filters
    if (filters.minDuration) {
      query += ` AND Duration >= {minDuration:UInt64}`
      queryParams.minDuration = Number.parseInt(filters.minDuration)
    }

    if (filters.maxDuration) {
      query += ` AND Duration <= {maxDuration:UInt64}`
      queryParams.maxDuration = Number.parseInt(filters.maxDuration)
    }

    // Add service name filter
    if (filters.ServiceName) {
      query += ` AND ServiceName = {serviceName:String}`
      queryParams.serviceName = filters.ServiceName
    }

    // Add status code filter
    if (filters.StatusCode) {
      query += ` AND StatusCode = {statusCode:String}`
      queryParams.statusCode = filters.StatusCode
    }

    // Add search filter
    if (filters.search) {
      query += ` AND (
        SpanName ILIKE {searchTerm:String} OR 
        ServiceName ILIKE {searchTerm:String} OR 
        TraceId ILIKE {searchTerm:String}
      )`
      queryParams.searchTerm = `%${filters.search}%`
    }

    // Add sorting
    if (sort) {
      const [column, direction] = sort.split(":")
      query += ` ORDER BY ${column} ${direction === "desc" ? "DESC" : "ASC"}`
    } else {
      query += ` ORDER BY Timestamp DESC`
    }

    // Add pagination
    query += ` LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`

    // Count query for pagination
    const countQuery = `
      SELECT count() as total
      FROM default.traces
      WHERE 1=1
    `

    // Add the same filters to the count query
    let fullCountQuery = countQuery
    if (filters.startDate) {
      fullCountQuery += ` AND Timestamp >= {startDate:DateTime64(9)}`
    }

    if (filters.endDate) {
      fullCountQuery += ` AND Timestamp <= {endDate:DateTime64(9)}`
    }

    if (filters.minDuration) {
      fullCountQuery += ` AND Duration >= {minDuration:UInt64}`
    }

    if (filters.maxDuration) {
      fullCountQuery += ` AND Duration <= {maxDuration:UInt64}`
    }

    if (filters.ServiceName) {
      fullCountQuery += ` AND ServiceName = {serviceName:String}`
    }

    if (filters.StatusCode) {
      fullCountQuery += ` AND StatusCode = {statusCode:String}`
    }

    if (filters.search) {
      fullCountQuery += ` AND (
        SpanName ILIKE {searchTerm:String} OR 
        ServiceName ILIKE {searchTerm:String} OR 
        TraceId ILIKE {searchTerm:String}
      )`
    }

    // Execute the main query
    const result = await client.query({
      query,
      query_params: queryParams,
      format: "JSONEachRow",
    })

    const traces = await result.json<TraceSpan>()

    // Execute the count query
    const countResult = await client.query({
      query: fullCountQuery,
      query_params: queryParams,
      format: "JSONEachRow",
    })

    const countData = await countResult.json<CountResult>()
    const totalCount = countData.length > 0 ? countData[0].total : 0

    // Return the results
    return NextResponse.json(
      {
        data: traces,
        count: totalCount,
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
    return NextResponse.json({ error: "Failed to fetch traces from ClickHouse" }, { status: 500 })
  }
}

