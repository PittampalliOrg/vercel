"use client"

import useSWR from "swr"

interface SlidingWindowData {
  minute_bucket: string
  logs_in_last_30m: number
}

async function fetcher(url: string) {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`)
  }
  const json = await res.json()
  return json.data as SlidingWindowData[]
}

export function useTracesSlidingWindow(period: string) {
  // e.g. period = "2 HOUR"
  const { data, error, isLoading, mutate } = useSWR(
    `/frontend/api/traces/sliding-window?period=${encodeURIComponent(period)}`,
    fetcher,
    {
      // refreshInterval: 30000, // optionally refresh every 30s
    }
  )

  return {
    data: data || [],
    error,
    isLoading,
    refresh: mutate,
  }
}
