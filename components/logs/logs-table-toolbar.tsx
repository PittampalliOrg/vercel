"use client"

import { Cross2Icon } from "@radix-ui/react-icons"
import { useCallback } from "react"
import type { Table } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableViewOptions } from "@/components/traces/data-table-view-options"
import { LogsTableFacetedFilter } from "./logs-table-faceted-filter"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
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

interface LogsTableToolbarProps<TData> {
  table: Table<TData>
}

export function LogsTableToolbar<TData>({ table }: LogsTableToolbarProps<TData>) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()

  const lookback = searchParams.get("lookback") || "1h"

  // Memoize the handler functions to prevent recreating them on every render
  const handleSearch = useCallback(
    (term: string) => {
      const params = new URLSearchParams(searchParams.toString())

      if (term) {
        params.set("search", term)
      } else {
        params.delete("search")
      }

      // Reset to first page when searching
      params.set("page", "1")

      replace(`${pathname}?${params.toString()}`)
    },
    [searchParams, pathname, replace],
  )

  const handleFilterChange = useCallback(
    (column: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())

      if (value) {
        params.set(column, value)
      } else {
        params.delete(column)
      }

      // Reset to first page when filtering
      params.set("page", "1")

      replace(`${pathname}?${params.toString()}`)
    },
    [searchParams, pathname, replace],
  )

  const handleLookbackChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("lookback", value)
      params.set("page", "1") // Reset to first page
      replace(`${pathname}?${params.toString()}`)
    },
    [searchParams, pathname, replace],
  )

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams()
    // Keep only pagination params and default lookback
    params.set("page", searchParams.get("page") || "1")
    params.set("pageSize", searchParams.get("pageSize") || "10")
    params.set("lookback", "1h")

    replace(`${pathname}?${params.toString()}`)
  }, [searchParams, pathname, replace])

  const isFiltered = table.getState().columnFilters.length > 0 || searchParams.has("search")

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Search logs..."
          value={searchParams.get("search") || ""}
          onChange={(event) => handleSearch(event.target.value)}
          className="h-9 w-full md:w-[250px] lg:w-[300px]"
        />

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

        {table.getColumn("ServiceName") && (
          <LogsTableFacetedFilter
            column={table.getColumn("ServiceName")}
            title="Service"
            onFilterChange={(value) => handleFilterChange("ServiceName", value)}
            selectedValue={searchParams.get("ServiceName") || undefined}
          />
        )}
        {table.getColumn("SeverityText") && (
          <LogsTableFacetedFilter
            column={table.getColumn("SeverityText")}
            title="Severity"
            onFilterChange={(value) => handleFilterChange("SeverityText", value)}
            selectedValue={searchParams.get("SeverityText") || undefined}
          />
        )}
        {isFiltered && (
          <Button variant="ghost" onClick={clearFilters} className="h-9 px-2 lg:px-3">
            Reset
            <Cross2Icon className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
}

