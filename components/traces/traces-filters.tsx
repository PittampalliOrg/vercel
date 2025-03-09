"use client"

import { useCallback, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Slider } from "@/components/ui/slider"
import { CalendarIcon, FilterIcon, ClockIcon } from "lucide-react"
import { format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Example lookback options
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
  // We used to do `value: ""`, but that’s no longer valid.
  { value: "CUSTOM", label: "Custom Range" },
]

export function TracesFilters() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()

  // Current selected lookback from URL or, if none, "CUSTOM"
  const currentLookback = searchParams.get("lookback") || "CUSTOM"

  const [startDate, setStartDate] = useState<Date | undefined>(
    searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined,
  )
  const [endDate, setEndDate] = useState<Date | undefined>(
    searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined,
  )
  const [minDuration, setMinDuration] = useState<number>(Number(searchParams.get("minDuration") || "0"))
  const [maxDuration, setMaxDuration] = useState<number>(Number(searchParams.get("maxDuration") || "5000"))

  // --- Handle LOOKBACK changes ---
  const handleLookbackChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())

      if (value === "CUSTOM") {
        // If user chooses "CUSTOM", remove any lookback from the URL
        params.delete("lookback")
      } else {
        // Use the chosen lookback value
        params.set("lookback", value)
        // Remove custom date range if previously set
        params.delete("startDate")
        params.delete("endDate")
      }

      // Reset to first page
      params.set("page", "1")
      replace(`${pathname}?${params.toString()}`)
    },
    [searchParams, pathname, replace],
  )

  // --- Apply filters for custom date/duration ---
  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString())

    // If user picks a custom date, remove lookback
    params.delete("lookback")

    // Update date filters
    if (startDate) {
      params.set("startDate", startDate.toISOString())
    } else {
      params.delete("startDate")
    }
    if (endDate) {
      params.set("endDate", endDate.toISOString())
    } else {
      params.delete("endDate")
    }

    // Update duration filters
    if (minDuration > 0) {
      params.set("minDuration", minDuration.toString())
    } else {
      params.delete("minDuration")
    }
    if (maxDuration < 5000) {
      params.set("maxDuration", maxDuration.toString())
    } else {
      params.delete("maxDuration")
    }

    // Reset page
    params.set("page", "1")
    replace(`${pathname}?${params.toString()}`)
  }

  // --- Reset all filters ---
  function resetFilters() {
    const params = new URLSearchParams(searchParams.toString())

    // Remove everything except page/pageSize
    params.delete("startDate")
    params.delete("endDate")
    params.delete("lookback")
    params.delete("minDuration")
    params.delete("maxDuration")

    params.set("page", searchParams.get("page") || "1")
    params.set("pageSize", searchParams.get("pageSize") || "10")

    replace(`${pathname}?${params.toString()}`)
  }

  // If the user’s lookback is "CUSTOM", then we allow the date pickers
  const isCustomRange = currentLookback === "CUSTOM"

  return (
    <div className="flex flex-wrap gap-2">
      {/* --- Lookback (relative time) dropdown --- */}
      <Select value={currentLookback} onValueChange={handleLookbackChange}>
        <SelectTrigger className="w-[200px]">
          <ClockIcon className="mr-2 h-4 w-4" />
          <SelectValue placeholder="Select time range" />
        </SelectTrigger>
        <SelectContent>
          {LOOKBACK_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* --- Date Range Picker (only relevant if lookback = CUSTOM) --- */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[240px] justify-start" disabled={!isCustomRange}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {startDate && endDate ? (
              <>
                {format(startDate, "PPP")} - {format(endDate, "PPP")}
              </>
            ) : (
              <span>Select date range</span>
            )}
          </Button>
        </PopoverTrigger>
        {isCustomRange && (
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex flex-col sm:flex-row">
              <div className="border-r p-2">
                <div className="px-3 py-2">
                  <h3 className="font-medium">Start date</h3>
                </div>
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
              </div>
              <div className="p-2">
                <div className="px-3 py-2">
                  <h3 className="font-medium">End date</h3>
                </div>
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border-t">
              <Button
                variant="ghost"
                onClick={() => {
                  setStartDate(undefined)
                  setEndDate(undefined)
                }}
              >
                Clear
              </Button>
              <Button onClick={applyFilters}>Apply</Button>
            </div>
          </PopoverContent>
        )}
      </Popover>

      {/* --- Duration slider --- */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[180px] justify-start">
            <FilterIcon className="mr-2 h-4 w-4" />
            <span>Duration filter</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px]" align="start">
          <div className="grid gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Duration range (ms)</h4>
              <Slider
                defaultValue={[minDuration, maxDuration]}
                min={0}
                max={5000}
                step={10}
                onValueChange={(values) => {
                  setMinDuration(values[0])
                  setMaxDuration(values[1])
                }}
              />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{minDuration}ms</span>
                <span className="text-sm text-muted-foreground">{maxDuration}ms</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setMinDuration(0)
                  setMaxDuration(5000)
                }}
              >
                Reset
              </Button>
              <Button onClick={applyFilters}>Apply</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* --- Global reset if any filter is set --- */}
      {(currentLookback !== "CUSTOM" || startDate || endDate || minDuration > 0 || maxDuration < 5000) && (
        <Button variant="ghost" onClick={resetFilters} className="h-9 px-2 lg:px-3">
          Reset all filters
        </Button>
      )}
    </div>
  )
}
