// Client-side API functions for logs
import { cache } from "react"

interface GetLogsOptions {
  page: number
  pageSize: number
  sort?: string
  filters?: Record<string, string>
  lookback?: string // New lookback parameter
}

// Cache the API calls to prevent duplicate requests
export const getLogs = cache(async ({ page, pageSize, sort, filters = {}, lookback = "1h" }: GetLogsOptions) => {
  try {
    // Build the query string
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    })

    if (sort) {
      params.set("sort", sort)
    }

    // Add lookback parameter
    params.set("lookback", lookback)

    // Add all filters to the query string
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      }
    })

    // Add a cache-busting parameter
    params.set("_t", Date.now().toString())

    console.log("Client: Sending request with params:", Object.fromEntries(params.entries()))

    // Make the request to our API route
    const response = await fetch(`/api/logs?${params.toString()}`, {
      method: "GET",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.details || `API error: ${response.status}`)
    }

    const data = await response.json()
    console.log("Client: Received response with", data.data?.length || 0, "logs")
    return data
  } catch (error) {
    console.error("Error fetching logs:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to fetch logs")
  }
})

// Cache the filter options to prevent duplicate requests
export const getLogFilterOptions = cache(async (column: string): Promise<string[]> => {
  try {
    // Add a cache-busting parameter
    const params = new URLSearchParams({
      column,
      _t: Date.now().toString(),
    })

    // Make the request to our API route
    const response = await fetch(`/api/logs/filters?${params.toString()}`, {
      method: "GET",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.details || `API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`Error fetching filter options for ${column}:`, error)
    return []
  }
})

export async function getLogDetail(timestamp: string) {
  try {
    // Add a cache-busting parameter
    const params = new URLSearchParams({
      _t: Date.now().toString(),
    })

    // Make the request to our API route
    const response = await fetch(`/api/logs/${encodeURIComponent(timestamp)}?${params.toString()}`, {
      method: "GET",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.details || `API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching log details:", error)
    throw new Error(error instanceof Error ? error.message : "Failed to fetch log details")
  }
}

