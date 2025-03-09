import "server-only"

import { createClient, ClickHouseLogLevel } from "@clickhouse/client"
import { ValidateAndLog } from "./generated/schema-validators-CHActions"

// Define interfaces for the data types
export interface TraceSpan {
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

export interface CountResult {
  total: number
}

export interface TraceEvent {
  name: string
  timestamp: string
  attributes: Record<string, any>
  spanId: string
}

export interface ProcessedSpan {
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

export interface GetTracesOptions {
  page: number
  pageSize: number
  sort?: string
  filters?: Record<string, string>
}

export interface TracesResult {
  data: TraceSpan[]
  count: number
}

export interface SlidingWindowRow {
  minute_bucket: string
  logs_in_last_30m: number
}


import type {
  Logger as CHLogger,
  LogParams,
  ErrorLogParams,
  WarnLogParams
} from "@clickhouse/client"
import { context, trace } from "@opentelemetry/api" // for reading active span
import { logger } from "./logger" // your Winston + OTel logger

/**
 * Helper that attaches current span context as metadata.
 */
function logWithSpanContext(
  level: "debug" | "info" | "warn" | "error",
  module: string,
  message: string,
  args?: Record<string, unknown>,
  err?: Error
) {
  // Read the currently active Span
  const span = trace.getSpan(context.active())
  const spanContext = span?.spanContext()

  // Merge the current OpenTelemetry span context into the log metadata
  logger.log({
    level,
    message: `[${module}] ${message}`,
    meta: {
      traceId: spanContext?.traceId,
      spanId: spanContext?.spanId,
      isRemote: spanContext?.isRemote,
      ...args,
      err,
    },
  })
}

/**
 * Custom ClickHouse Logger that delegates to Winston.
 */
class ClickHouseOTelLogger implements CHLogger {
  trace({ module, message, args }: LogParams): void {
    // Winston doesn't have 'trace' by default; map to 'debug'
    logWithSpanContext("debug", module, message, args)
  }

  debug({ module, message, args }: LogParams): void {
    logWithSpanContext("debug", module, message, args)
  }

  info({ module, message, args }: LogParams): void {
    logWithSpanContext("info", module, message, args)
  }

  warn({ module, message, args, err }: WarnLogParams): void {
    logWithSpanContext("warn", module, message, args, err)
  }

  error({ module, message, args, err }: ErrorLogParams): void {
    logWithSpanContext("error", module, message, args, err)
  }
}

export const clickhouseClient = createClient({
  url: process.env.CLICKHOUSE_LOCAL_ENDPOINT,
  username: process.env.CLICKHOUSE_LOCAL_USERNAME,
  password: process.env.CLICKHOUSE_LOCAL_PASSWORD,
  request_timeout: 30000,
  log: {
    LoggerClass: ClickHouseOTelLogger,
    // Adjust level depending on the verbosity you want
    level: ClickHouseLogLevel.DEBUG,
  },
})

// ---------------------------------------------------------
// Helper: convert '1h' -> '1 HOUR', '5m' -> '5 MINUTE', etc.
// ---------------------------------------------------------
function parseLookbackToInterval(value: string): string | null {
  // Pattern: digits + single-letter unit
  // e.g. "5m", "1h", "2d"
  const match = value.match(/^(\d+)([mhd])$/)
  if (!match) return null

  const [_, num, unit] = match
  switch (unit) {
    case "m":
      return `${num} MINUTE`
    case "h":
      return `${num} HOUR`
    case "d":
      return `${num} DAY`
    default:
      return null
  }
}

export class CHActions {
  @ValidateAndLog
  async fetchTraces({ page, pageSize, sort, filters = {} }: GetTracesOptions): Promise<TracesResult> {
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
      FROM default.otel_traces
      WHERE 1=1
    `
    const queryParams: Record<string, any> = {}

    // -------------------------
    // 1) Handle lookback first
    // -------------------------
    if (filters.lookback) {
      const interval = parseLookbackToInterval(filters.lookback)
      if (interval) {
        // Use now() - INTERVAL
        query += ` AND Timestamp >= now() - INTERVAL ${interval}`
      }
    } else {
      // If no lookback, fallback to startDate/endDate
      if (filters.startDate) {
        query += ` AND Timestamp >= {startDate:DateTime64(9)}`
        queryParams.startDate = filters.startDate
      }
      if (filters.endDate) {
        query += ` AND Timestamp <= {endDate:DateTime64(9)}`
        queryParams.endDate = filters.endDate
      }
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

    // Ensure we never exceed a maximum number of rows
    if (pageSize > 100) {
      query = query.replace(`LIMIT ${pageSize}`, "LIMIT 100")
    }

    // Build the count query
    let fullCountQuery = `
      SELECT count() as total
      FROM default.otel_traces
      WHERE 1=1
    `

    // Mirror the lookback logic in the count query
    if (filters.lookback) {
      const interval = parseLookbackToInterval(filters.lookback)
      if (interval) {
        fullCountQuery += ` AND Timestamp >= now() - INTERVAL ${interval}`
      }
    } else {
      if (filters.startDate) {
        fullCountQuery += ` AND Timestamp >= {startDate:DateTime64(9)}`
      }
      if (filters.endDate) {
        fullCountQuery += ` AND Timestamp <= {endDate:DateTime64(9)}`
      }
    }

    // Mirror the other filters
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

    try {
      // Execute the main query
      const result = await clickhouseClient.query({
        query,
        query_params: queryParams,
        format: "JSONEachRow",
      })
      const traces = await result.json<TraceSpan>()

      // Execute the count query
      const countResult = await clickhouseClient.query({
        query: fullCountQuery,
        query_params: queryParams,
        format: "JSONEachRow",
      })
      const countData = await countResult.json<CountResult>()
      const totalCount = countData.length > 0 ? countData[0].total : 0

      return {
        data: traces,
        count: totalCount,
      }
    } catch (error) {
      console.error("Error querying ClickHouse:", error)
      throw new Error("Failed to fetch traces from ClickHouse")
    }
  }

  @ValidateAndLog
  async fetchTraceDetail(traceId: string) {
    try {
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
        FROM default.otel_traces
        WHERE TraceId = {traceId:String} AND (ParentSpanId = '' OR ParentSpanId IS NULL)
        LIMIT 1
      `

      const rootSpanResult = await clickhouseClient.query({
        query: rootSpanQuery,
        query_params: { traceId },
        format: "JSONEachRow",
      })
      const rootSpanData = await rootSpanResult.json<TraceSpan>()

      if (!rootSpanData.length) {
        throw new Error(`Trace with ID ${traceId} not found`)
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
        FROM default.otel_traces
        WHERE TraceId = {traceId:String}
        ORDER BY Timestamp ASC
        LIMIT 1000
      `

      const spansResult = await clickhouseClient.query({
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

      // Calculate the earliest start time
      const startTime = Math.min(...spansData.map((s) => new Date(s.Timestamp).getTime()))

      // Process spans for timeline
      const spans: ProcessedSpan[] = spansData.map((span) => ({
        spanId: span.SpanId,
        parentSpanId: span.ParentSpanId,
        name: span.SpanName,
        kind: span.SpanKind,
        serviceName: span.ServiceName,
        startTime: new Date(span.Timestamp).getTime() - startTime, // relative offset
        duration: span.Duration,
        status: span.StatusCode,
        attributes: span.SpanAttributes || {},
      }))

      return {
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
      }
    } catch (error) {
      console.error("Error querying ClickHouse for trace details:", error)
      throw error
    }
  }

  @ValidateAndLog
  async fetchFilterOptions(column: string): Promise<string[]> {
    try {
      const query = `
        SELECT DISTINCT ${column}
        FROM default.otel_traces
        WHERE ${column} IS NOT NULL AND ${column} != ''
        ORDER BY ${column} ASC
        LIMIT 100
      `
      const result = await clickhouseClient.query({
        query,
        format: "JSONEachRow",
      })

      const data = await result.json<Record<string, any>>()

      // Convert column values to strings, filter out null/undefined
      return data
        .map((item) => {
          if (column in item) {
            const value = item[column as keyof typeof item]
            return value != null ? String(value) : null
          }
          return null
        })
        .filter((v): v is string => v !== null)
    } catch (error) {
      console.error(`Error fetching filter options for ${column}:`, error)
      return []
    }
  }

  @ValidateAndLog
  async fetchTracesSlidingWindow(period: string = "2 HOUR"): Promise<SlidingWindowRow[]> {
    // period could be "2 HOUR", "4 HOUR", etc.
    // e.g. "1 HOUR", "30 MINUTE" etc. Just ensure it's valid for ClickHouse.

    const query = `
      WITH intervals AS (
        SELECT
          Timestamp,
          count(*) OVER (
            ORDER BY toUnixTimestamp(Timestamp)
            RANGE BETWEEN 1800 PRECEDING AND CURRENT ROW
          ) AS logs_in_window
        FROM default.otel_traces
        WHERE Timestamp >= now() - INTERVAL ${period}
      )
      SELECT
        toStartOfInterval(Timestamp, INTERVAL 1 MINUTE) AS minute_bucket,
        max(logs_in_window) AS logs_in_last_30m
      FROM intervals
      GROUP BY minute_bucket
      ORDER BY minute_bucket
    `

    try {
      const result = await clickhouseClient.query({
        query,
        format: "JSONEachRow",
      })
      const rows = await result.json<SlidingWindowRow>()
      return rows
    } catch (error) {
      console.error("Error querying sliding window in ClickHouse:", error)
      throw new Error("Failed to fetch sliding-window traces.")
    }
  }
}

// Create a single instance to export
export const actions = new CHActions()

// Individual exports for convenience
export const { fetchTraces, fetchTraceDetail, fetchFilterOptions, fetchTracesSlidingWindow } = actions
