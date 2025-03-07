"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Slider } from "@/components/ui/slider"
import { CalendarIcon, FilterIcon } from "lucide-react"
import { format } from "date-fns"

export function TracesFilters() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()

  const [startDate, setStartDate] = useState<Date | undefined>(
    searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : undefined,
  )
  const [endDate, setEndDate] = useState<Date | undefined>(
    searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : undefined,
  )
  const [minDuration, setMinDuration] = useState<number>(Number(searchParams.get("minDuration") || "0"))
  const [maxDuration, setMaxDuration] = useState<number>(Number(searchParams.get("maxDuration") || "5000"))

  function applyFilters() {
    const params = new URLSearchParams(searchParams.toString())

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

    // Reset to first page
    params.set("page", "1")

    replace(`${pathname}?${params.toString()}`)
  }

  function resetFilters() {
    setStartDate(undefined)
    setEndDate(undefined)
    setMinDuration(0)
    setMaxDuration(5000)

    const params = new URLSearchParams(searchParams.toString())
    params.delete("startDate")
    params.delete("endDate")
    params.delete("minDuration")
    params.delete("maxDuration")
    params.set("page", "1")

    replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[240px] justify-start">
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
      </Popover>

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

      {(startDate || endDate || minDuration > 0 || maxDuration < 5000) && (
        <Button variant="ghost" onClick={resetFilters} className="h-9 px-2 lg:px-3">
          Reset all filters
        </Button>
      )}
    </div>
  )
}

