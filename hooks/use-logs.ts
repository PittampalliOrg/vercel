"use client"

import { useEffect, useState, useRef } from "react"
import { getLogs } from "@/lib/logs-api"

interface UseLogsOptions {
  page: number
  pageSize: number
  sort?: string
  filters?: Record<string, string>
  lookback?: string // New lookback parameter
}

export function useLogs({ page, pageSize, sort, filters, lookback = "1h" }: UseLogsOptions) {
  const [logs, setLogs] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Use a ref to track if this is the first render
  const isFirstRender = useRef(true)

  // Use a ref to store the timestamp to avoid re-renders
  const timestampRef = useRef(Date.now())

  useEffect(() => {
    // Only set isLoading to true on first render or when query params change
    if (isFirstRender.current) {
      isFirstRender.current = false
    } else {
      setIsLoading(true)
    }

    let isMounted = true

    // Use a single timestamp for the entire component lifecycle
    const timestamp = timestampRef.current

    async function fetchLogs() {
      try {
        console.log("useLogs: Fetching logs with params:", { page, pageSize, sort, filters, lookback })

        const { data, count } = await getLogs({
          page,
          pageSize,
          sort,
          filters: {
            ...filters,
            // Use the stable timestamp reference
            _t: timestamp.toString(),
          },
          lookback,
        })

        console.log(`useLogs: Received ${data.length} logs with total count ${count}`)

        if (isMounted) {
          setLogs(data)
          setTotalCount(count)
          setError(null)
          setIsLoading(false)
        }
      } catch (err) {
        console.error("Error in useLogs:", err)

        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Failed to fetch logs"))
          console.error("Error fetching logs:", err)
          setIsLoading(false)
        }
      }
    }

    // Create a debounce mechanism to prevent rapid successive calls
    const timeoutId = setTimeout(() => {
      fetchLogs()
    }, 100)

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [
    page,
    pageSize,
    sort,
    lookback,
    // Use JSON.stringify only once for filters
    JSON.stringify(filters),
  ])

  return { logs, totalCount, isLoading, error }
}

