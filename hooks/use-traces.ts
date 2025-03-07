"use client"

import { useEffect, useState } from "react"
import { getTraces } from "@/lib/api"

interface UseTracesOptions {
  page: number
  pageSize: number
  sort?: string
  filters?: Record<string, string>
}

export function useTraces({ page, pageSize, sort, filters }: UseTracesOptions) {
  const [traces, setTraces] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let isMounted = true

    async function fetchTraces() {
      try {
        setIsLoading(true)
        const { data, count } = await getTraces({ page, pageSize, sort, filters })

        if (isMounted) {
          setTraces(data)
          setTotalCount(count)
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Failed to fetch traces"))
          console.error("Error fetching traces:", err)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchTraces()

    return () => {
      isMounted = false
    }
  }, [page, pageSize, sort, JSON.stringify(filters)])

  return { traces, totalCount, isLoading, error }
}

