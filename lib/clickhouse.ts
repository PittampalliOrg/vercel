import "server-only"

import { createClient } from "@clickhouse/client"
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

const client = createClient({
  url: process.env.CLICKHOUSE_LOCAL_ENDPOINT,
  username: process.env.CLICKHOUSE_LOCAL_USERNAME,
  password: process.env.CLICKHOUSE_LOCAL_PASSWORD,
  request_timeout: 30000,
})

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
    
      // Ensure we never exceed a maximum number of rows regardless of pageSize
      if (pageSize > 100) {
        query = query.replace(`LIMIT ${pageSize}`, "LIMIT 100")
      }
    
      // Count query for pagination
      const countQuery = `
        SELECT count() as total
        FROM default.otel_traces
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
    
      try {
        // Execute the main query
        const result = await client.query({
          query,
          query_params: queryParams,
          format: "JSONEachRow",
        })
    
        // Fixed: Use the item type, not the array type
        const traces = await result.json<TraceSpan>()
    
        // Execute the count query
        const countResult = await client.query({
          query: fullCountQuery,
          query_params: queryParams,
          format: "JSONEachRow",
        })
    
        // Fixed: Use the item type, not the array type
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
    
        const rootSpanResult = await client.query({
          query: rootSpanQuery,
          query_params: { traceId },
          format: "JSONEachRow",
        })
    
        // Fixed: Use the item type, not the array type
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
    
        const spansResult = await client.query({
          query: spansQuery,
          query_params: { traceId },
          format: "JSONEachRow",
        })
    
        // Fixed: Use the item type, not the array type
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
    
    // Fix the fetchFilterOptions function to properly handle types
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
    
        const result = await client.query({
          query,
          format: "JSONEachRow",
        })
    
        // Fixed: Use the item type, not the array type
        const data = await result.json<Record<string, any>>()
    
        // Extract values and convert them to strings
        return data
          .map((item) => {
            if (column in item) {
              const value = item[column as keyof typeof item]
              // Convert any value to string or filter it out if it's null/undefined
              return value != null ? String(value) : null
            }
            return null
          })
          .filter((value): value is string => value !== null)
      } catch (error) {
        console.error(`Error fetching filter options for ${column}:`, error)
        return []
      }
    }
}
    
// Create a single instance to export
export const actions = new CHActions();

// individual methods for convenience
export const {
    fetchTraces,
    fetchTraceDetail,
    fetchFilterOptions,
} = actions;

