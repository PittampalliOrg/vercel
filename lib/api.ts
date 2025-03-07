// Remove the direct ClickHouse client code and replace with fetch calls to our API routes

import { ValidateAndLog } from "./generated/schema-validators-CHActions"

interface GetTracesOptions {
  page: number
  pageSize: number
  sort?: string
  filters?: Record<string, string>
}

export class CHActions {
  @ValidateAndLog
  async getTraces({ page, pageSize, sort, filters = {} }: GetTracesOptions) {
  try {
    // Build the query string
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    })

    if (sort) {
      params.set("sort", sort)
    }

    // Add all filters to the query string
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      }
    })

    // Add a cache-busting parameter
    params.set("_t", Date.now().toString())

    // Make the request to our API route
    const response = await fetch(`/api/traces?${params.toString()}`, {
      method: "GET",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching traces:", error)
    throw new Error("Failed to fetch traces from ClickHouse")
  }
}

  async getTraceDetail(traceId: string) {
  try {
    // Add a cache-busting parameter
    const params = new URLSearchParams({
      _t: Date.now().toString(),
    })

    // Make the request to our API route
    const response = await fetch(`/api/traces/${traceId}?${params.toString()}`, {
      method: "GET",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error fetching trace details:", error)
    throw new Error("Failed to fetch trace details from ClickHouse")
  }
}

// Add the getFilterOptions function that was missing
  async getFilterOptions(column: string): Promise<string[]> {
  try {
    // Add a cache-busting parameter
    const params = new URLSearchParams({
      column,
      _t: Date.now().toString(),
    })

    // Make the request to our API route
    const response = await fetch(`/api/filters?${params.toString()}`, {
      method: "GET",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return await response.json()
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
  getTraces,
  getTraceDetail,
  getFilterOptions,
} = actions;
