// 'lib/clickhouse-logs.ts'
"use server"

import { clickhouseClient } from "@/lib/clickhouse" // <-- Reuse the existing client
import { trace, context, SpanStatusCode } from "@opentelemetry/api"

/**
 * Matches the columns in your otel_logs schema exactly:
 *
 * 1. Timestamp          DateTime64(9)
 * 2. TimestampTime      DateTime
 * 3. TraceId            String
 * 4. SpanId             String
 * 5. TraceFlags         UInt8
 * 6. SeverityText       LowCardinality(String)
 * 7. SeverityNumber     UInt8
 * 8. ServiceName        LowCardinality(String)
 * 9. Body               String
 * 10. ResourceSchemaUrl LowCardinality(String)
 * 11. ResourceAttributes Map(LowCardinality(String), String)
 * 12. ScopeSchemaUrl    LowCardinality(String)
 * 13. ScopeName         String
 * 14. ScopeVersion      LowCardinality(String)
 * 15. ScopeAttributes   Map(LowCardinality(String), String)
 * 16. LogAttributes     Map(LowCardinality(String), String)
 */
export interface LogEntry {
  Timestamp: string
  TimestampTime: string
  TraceId: string
  SpanId: string
  TraceFlags: number
  SeverityText: string
  SeverityNumber: number
  ServiceName: string
  Body: string
  ResourceSchemaUrl: string
  ResourceAttributes: Record<string, string>
  ScopeSchemaUrl: string
  ScopeName: string
  ScopeVersion: string
  ScopeAttributes: Record<string, string>
  LogAttributes: Record<string, string>
}

/** For queries that return a count() as total. */
export interface CountResult {
  total: number
}

export interface LogsResult {
  data: LogEntry[]
  count: number
}

export interface GetLogsOptions {
  page: number
  pageSize: number
  sort?: string
  filters?: Record<string, string>
  lookback?: string // e.g. "12h", "1d", etc.
}

// Simple tracer utility
async function withTracing<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const activeCtx = context.active()
  const span = trace.getTracer("logs-actions").startSpan(`LogsActions.${name}`, undefined, activeCtx)
  try {
    return await fn()
  } catch (error: any) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: error?.message })
    throw error
  } finally {
    span.end()
  }
}

/**
 * Helper that converts a lookback string (e.g. "12h") into ClickHouse INTERVAL syntax.
 */
function parseLookback(lookback: string): string {
  const value = lookback.slice(0, -1) // everything but last char
  const unit = lookback.slice(-1).toLowerCase() // "m", "h", "d", etc.

  switch (unit) {
    case "m":
      return `INTERVAL ${value} MINUTE`
    case "h":
      return `INTERVAL ${value} HOUR`
    case "d":
      return `INTERVAL ${value} DAY`
    default:
      return `INTERVAL 1 HOUR`
  }
}

/**
 * Fetch multiple logs from 'default.otel_logs' with pagination,
 * optional lookback, sorting, and filters.
 */
export async function fetchLogs({
  page,
  pageSize,
  sort,
  filters = {},
  lookback = "1h",
}: GetLogsOptions): Promise<LogsResult> {
  return withTracing("fetchLogs", async () => {
    // Build the base query
    let query = `
      SELECT 
        Timestamp,
        TimestampTime,
        TraceId,
        SpanId,
        TraceFlags,
        SeverityText,
        SeverityNumber,
        ServiceName,
        Body,
        ResourceSchemaUrl,
        ResourceAttributes,
        ScopeSchemaUrl,
        ScopeName,
        ScopeVersion,
        ScopeAttributes,
        LogAttributes
      FROM default.otel_logs
      WHERE 1=1
    `

    const queryParams: Record<string, any> = {}

    // Lookback: "Timestamp >= now() - <interval>"
    const interval = parseLookback(lookback)
    query += ` AND Timestamp >= now() - ${interval}`

    // Example filter: ServiceName
    if (filters.ServiceName) {
      query += ` AND ServiceName = {serviceName:String}`
      queryParams.serviceName = filters.ServiceName
    }

    // Example filter: SeverityText
    if (filters.SeverityText) {
      if (filters.SeverityText === "NONE") {
        query += ` AND (SeverityText = '' OR SeverityText IS NULL)`
      } else {
        query += ` AND SeverityText = {severityText:String}`
        queryParams.severityText = filters.SeverityText
      }
    }

    // Example filter: TraceId
    if (filters.TraceId) {
      query += ` AND TraceId = {traceId:String}`
      queryParams.traceId = filters.TraceId
    }

    // Example “search” filter - emulate case-insensitive
    if (filters.search) {
      query += `
        AND (
          lower(Body) LIKE lower({searchTerm:String})
          OR lower(ServiceName) LIKE lower({searchTerm:String})
          OR lower(TraceId) LIKE lower({searchTerm:String})
        )
      `
      queryParams.searchTerm = `%${filters.search}%`
    }

    // Sorting
    if (sort) {
      const [col, direction] = sort.split(":")
      const dir = direction?.toLowerCase() === "desc" ? "DESC" : "ASC"
      query += ` ORDER BY ${col} ${dir}`
    } else {
      query += ` ORDER BY Timestamp DESC`
    }

    // Pagination
    const limit = Math.min(pageSize, 100)
    const offset = (page - 1) * pageSize
    query += ` LIMIT ${limit} OFFSET ${offset}`

    // Execute main query
    let logs: LogEntry[] = []
    console.log("Executing main logs query:", query, queryParams)
    try {
      const mainResult = await clickhouseClient.query({
        query,
        query_params: queryParams,
        format: "JSONEachRow",
      })
      logs = await mainResult.json<LogEntry>()
      console.log(`Fetched ${logs.length} logs from ClickHouse.`)
    } catch (err) {
      console.error("Error executing logs query:", err)
      throw err
    }

    // Build a separate count query
    let countQuery = `
      SELECT count() as total
      FROM default.otel_logs
      WHERE 1=1
      AND Timestamp >= now() - ${interval}
    `
    if (filters.ServiceName) {
      countQuery += ` AND ServiceName = {serviceName:String}`
    }
    if (filters.SeverityText) {
      if (filters.SeverityText === "NONE") {
        countQuery += ` AND (SeverityText = '' OR SeverityText IS NULL)`
      } else {
        countQuery += ` AND SeverityText = {severityText:String}`
      }
    }
    if (filters.TraceId) {
      countQuery += ` AND TraceId = {traceId:String}`
    }
    if (filters.search) {
      countQuery += `
        AND (
          lower(Body) LIKE lower({searchTerm:String})
          OR lower(ServiceName) LIKE lower({searchTerm:String})
          OR lower(TraceId) LIKE lower({searchTerm:String})
        )
      `
    }

    console.log("Executing logs count query:", countQuery, queryParams)
    let totalCount = 0
    try {
      const countResult = await clickhouseClient.query({
        query: countQuery,
        query_params: queryParams,
        format: "JSONEachRow",
      })
      const countData = await countResult.json<CountResult>()
      if (countData.length > 0) {
        totalCount = countData[0].total
      }
      console.log(`Total count is ${totalCount}`)
    } catch (err) {
      console.error("Error executing logs count query:", err)
      throw err
    }

    // If still no results, you could do a fallback. (Optional)
    if (logs.length === 0 && totalCount === 0) {
      console.log("No results found. (Optional) Could return unfiltered data or just return an empty array.")
      // Example unfiltered fallback omitted for brevity
    }

    return {
      data: logs,
      count: totalCount,
    }
  })
}

/**
 * Fetch a single log detail by the Timestamp value (assuming it's unique).
 */
export async function fetchLogDetail(timestampStr: string): Promise<LogEntry> {
  return withTracing("fetchLogDetail", async () => {
    const query = `
      SELECT
        Timestamp,
        TimestampTime,
        TraceId,
        SpanId,
        TraceFlags,
        SeverityText,
        SeverityNumber,
        ServiceName,
        Body,
        ResourceSchemaUrl,
        ResourceAttributes,
        ScopeSchemaUrl,
        ScopeName,
        ScopeVersion,
        ScopeAttributes,
        LogAttributes
      FROM default.otel_logs
      WHERE Timestamp = {timestamp:String}
      LIMIT 1
    `
    console.log("Executing fetchLogDetail:", query, { timestamp: timestampStr })
    try {
      const result = await clickhouseClient.query({
        query,
        query_params: { timestamp: timestampStr },
        format: "JSONEachRow",
      })
      const rows = await result.json<LogEntry>()
      if (!rows.length) {
        throw new Error(`Log with Timestamp=${timestampStr} not found.`)
      }
      return rows[0]
    } catch (error) {
      console.error("Error in fetchLogDetail:", error)
      throw error
    }
  })
}

/**
 * Fetch distinct filter options for a given column, skipping any Map(...) columns.
 */
export async function fetchFilterOptions(column: string): Promise<string[]> {
  return withTracing("fetchFilterOptions", async () => {
    if (column.includes("Attributes")) {
      return []
    }

    const query = `
      SELECT DISTINCT ${column}
      FROM default.otel_logs
      WHERE ${column} IS NOT NULL
      ORDER BY ${column} ASC
      LIMIT 100
    `
    console.log("Executing fetchFilterOptions:", query)
    try {
      const result = await clickhouseClient.query({ query, format: "JSONEachRow" })
      const data = await result.json<Record<string, unknown>>()

      return data
        .map(row => {
          const val = row[column] as string | undefined
          return val ?? null
        })
        .filter((s): s is string => s !== null)
    } catch (error) {
      console.error(`Error fetching filter options for column '${column}':`, error)
      return []
    }
  })
}
