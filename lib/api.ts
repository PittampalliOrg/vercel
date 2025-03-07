// Client-side API functions that call our API routes

interface GetTracesOptions {
  page: number
  pageSize: number
  sort?: string
  filters?: Record<string, string>
}

export async function getTraces({ page, pageSize, sort, filters = {} }: GetTracesOptions) {
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

export async function getTraceDetail(traceId: string) {
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

export async function getFilterOptions(column: string): Promise<string[]> {
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

