"use client"

import { useCallback } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ClockIcon } from "lucide-react"

// Define lookback options
const LOOKBACK_OPTIONS = [
  { value: "5m", label: "Last 5 minutes" },
  { value: "15m", label: "Last 15 minutes" },
  { value: "30m", label: "Last 30 minutes" },
  { value: "1h", label: "Last 1 hour" },
  { value: "2h", label: "Last 2 hours" },
  { value: "3h", label: "Last 3 hours" },
  { value: "6h", label: "Last 6 hours" },
  { value: "12h", label: "Last 12 hours" },
  { value: "24h", label: "Last 24 hours" },
]

export function LogsFilters() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()

  const lookback = searchParams.get("lookback") || "1h"
  const severity = searchParams.get("SeverityText") || "ALL"

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())

    // Update lookback filter
    params.set("lookback", lookback)

    // Update severity filter
    if (severity && severity !== "ALL") {
      params.set("SeverityText", severity)
    } else {
      params.delete("SeverityText")
    }

    // Remove old date filters if they exist
    params.delete("startTime")
    params.delete("endTime")

    // Reset to first page
    params.set("page", "1")

    replace(`${pathname}?${params.toString()}`)
  }, [lookback, severity, searchParams, pathname, replace])

  const resetFilters = useCallback(() => {
    const params = new URLSearchParams()
    // Keep only pagination params
    params.set("page", searchParams.get("page") || "1")
    params.set("pageSize", searchParams.get("pageSize") || "10")
    params.set("lookback", "1h") // Default to 1 hour

    replace(`${pathname}?${params.toString()}`)
  }, [searchParams, pathname, replace])

  const handleLookbackChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("lookback", value)
    params.set("page", "1") // Reset to first page
    replace(`${pathname}?${params.toString()}`)
  }

  const handleSeverityChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value === "ALL") {
      params.delete("SeverityText")
    } else {
      params.set("SeverityText", value)
    }

    params.set("page", "1") // Reset to first page
    replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Select value={lookback} onValueChange={handleLookbackChange}>
        <SelectTrigger className="w-[180px]">
          <ClockIcon className="mr-2 h-4 w-4" />
          <SelectValue placeholder="Select time range" />
        </SelectTrigger>
        <SelectContent>
          {LOOKBACK_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={severity} onValueChange={handleSeverityChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select severity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Severities</SelectItem>
          <SelectItem value="INFO">INFO</SelectItem>
          <SelectItem value="WARN">WARN</SelectItem>
          <SelectItem value="ERROR">ERROR</SelectItem>
          <SelectItem value="DEBUG">DEBUG</SelectItem>
          <SelectItem value="NONE">NONE</SelectItem>
        </SelectContent>
      </Select>

      {severity && severity !== "ALL" && (
        <Button variant="ghost" onClick={resetFilters} className="h-9 px-2 lg:px-3">
          Reset all filters
        </Button>
      )}
    </div>
  )
}

