"use client"

import { useState, useMemo } from "react"
import { format, parseISO } from "date-fns"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { CalendarIcon, RefreshCwIcon, ClockIcon } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import { useTracesSlidingWindow } from "@/hooks/use-traces-sliding-window"

// A small helper to safely format any "date-like" value:
function safeFormatDate(value: unknown, dateFormat: string): string {
  if (!value) return ""
  
  let dateObj: Date;
  if (value instanceof Date) {
    dateObj = value;
  } else if (typeof value === "string" || typeof value === "number") {
    dateObj = new Date(value);
  } else {
    return ""; // Invalid input type
  }
  
  if (isNaN(dateObj.getTime())) {
    return ""
  }
  return format(dateObj, dateFormat)
}

// If your hook data is always shaped like this:
interface SlidingWindowRow {
  minute_bucket: string
  logs_in_last_30m: number
}

interface TracesSlidingWindowChartProps {
  defaultPeriod?: string // e.g. "2 HOUR"
}

// Interval options for the user to pick
const PERIOD_OPTIONS = [
  { label: "Last 2 Hours", value: "2 HOUR" },
  { label: "Last 4 Hours", value: "4 HOUR" },
  { label: "Last 1 Day", value: "1 DAY" },
  { label: "Last 2 Days", value: "2 DAY" },
]

export function TracesSlidingWindowChart({ defaultPeriod = "2 HOUR" }: TracesSlidingWindowChartProps) {
  const [period, setPeriod] = useState(defaultPeriod)

  // Suppose your hook returns { data: SlidingWindowRow[]; isLoading: boolean; ... }
  const { data, isLoading, refresh } = useTracesSlidingWindow(period)

  // Convert server data to chart format
  const formattedData = useMemo(() => {
    return data.map((item: SlidingWindowRow) => ({
      timestamp: parseISO(item.minute_bucket), // now recognized as string
      logs_in_last_30m: item.logs_in_last_30m,
    }))
  }, [data])

  const minCount = useMemo(
    () => (data.length ? Math.min(...data.map((d) => d.logs_in_last_30m)) : 0),
    [data],
  )
  const maxCount = useMemo(
    () => (data.length ? Math.max(...data.map((d) => d.logs_in_last_30m)) : 0),
    [data],
  )

  const [filterRange, setFilterRange] = useState<[number, number]>([minCount, maxCount])
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})

  // Ensure filterRange is within new min/max
  if (filterRange[0] < minCount || filterRange[1] > maxCount) {
    setFilterRange([minCount, maxCount])
  }

  // Filter the data by count range & date range
  const filteredData = useMemo(() => {
    return formattedData.filter((item) => {
      const countOk = item.logs_in_last_30m >= filterRange[0] && item.logs_in_last_30m <= filterRange[1]

      let dateOk = true
      if (dateRange.from && item.timestamp < dateRange.from) {
        dateOk = false
      }
      if (dateRange.to && item.timestamp > dateRange.to) {
        dateOk = false
      }

      return countOk && dateOk
    })
  }, [formattedData, filterRange, dateRange])

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle>Trace Count Sliding Window (30m)</CardTitle>
            <CardDescription>Count of traces in the last 30 minutes, per 1-minute bucket.</CardDescription>
          </div>
          {/* Period Selector + Refresh */}
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px]">
                <ClockIcon className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={(e) => refresh()} disabled={isLoading}>
              <RefreshCwIcon className={cn("h-4 w-4", isLoading && "animate-spin")} />
              <span className="sr-only">Refresh data</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-8">
          {/* Date Range */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1">
              <p className="text-sm font-medium mb-2">Date Range</p>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal w-[200px]">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? format(dateRange.from, "PPP") : "Select start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.from}
                      onSelect={(date) => setDateRange((prev) => ({ ...prev, from: date || undefined }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span className="self-center">to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal w-[200px]">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.to ? format(dateRange.to, "PPP") : "Select end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateRange.to}
                      onSelect={(date) => setDateRange((prev) => ({ ...prev, to: date || undefined }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Count Range Slider */}
          <div>
            <div className="flex justify-between mb-2">
              <p className="text-sm font-medium">Filter by Trace Count</p>
              <p className="text-sm text-muted-foreground">
                {filterRange[0]} - {filterRange[1]}
              </p>
            </div>
            <Slider
              min={minCount}
              max={maxCount}
              step={1}
              value={filterRange}
              onValueChange={(vals) => setFilterRange(vals as [number, number])}
              className="mb-6"
            />
          </div>

          {/* Chart */}
          <div className="h-[400px]">
            <ChartContainer
              config={{
                logs: {
                  label: "Logs in 30m Window",
                  color: "hsl(var(--chart-1))",
                },
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) => safeFormatDate(value, "HH:mm")}
                  />
                  <YAxis />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(val) => {
                          if (!val) return ""
                          const asNum = Number(val)
                          return Number.isNaN(asNum) ? "" : asNum.toLocaleString()
                        }}
                        labelFormatter={(label) => safeFormatDate(label, "MMM dd, yyyy HH:mm")}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="logs_in_last_30m"
                    stroke="var(--color-logs)"
                    fill="var(--color-logs)"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          {/* Simple stats below chart */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{filteredData.length}</div>
                <p className="text-xs text-muted-foreground">Data Points</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {filteredData.length
                    ? Math.min(...filteredData.map((d) => d.logs_in_last_30m)).toLocaleString()
                    : 0}
                </div>
                <p className="text-xs text-muted-foreground">Min Count</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  {filteredData.length
                    ? Math.max(...filteredData.map((d) => d.logs_in_last_30m)).toLocaleString()
                    : 0}
                </div>
                <p className="text-xs text-muted-foreground">Max Count</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
