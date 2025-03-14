"use client"

import { Cross2Icon } from "@radix-ui/react-icons"
import type { Table } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableViewOptions } from "./data-table-view-options"
import { DataTableFacetedFilter } from "./data-table-faceted-filter"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

export function DataTableToolbar<TData>({ table }: DataTableToolbarProps<TData>) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()

  function handleSearch(term: string) {
    const params = new URLSearchParams(searchParams.toString())

    if (term) {
      params.set("search", term)
    } else {
      params.delete("search")
    }

    // Reset to first page when searching
    params.set("page", "1")

    replace(`${pathname}?${params.toString()}`)
  }

  function handleFilterChange(column: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())

    if (value) {
      params.set(column, value)
    } else {
      params.delete(column)
    }

    // Reset to first page when filtering
    params.set("page", "1")

    replace(`${pathname}?${params.toString()}`)
  }

  function clearFilters() {
    const params = new URLSearchParams()
    // Keep only pagination params
    params.set("page", searchParams.get("page") || "1")
    params.set("pageSize", searchParams.get("pageSize") || "10")

    replace(`${pathname}?${params.toString()}`)
  }

  const isFiltered = table.getState().columnFilters.length > 0

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Search traces..."
          value={searchParams.get("search") || ""}
          onChange={(event) => handleSearch(event.target.value)}
          className="h-9 w-full md:w-[250px] lg:w-[300px]"
        />
        {table.getColumn("ServiceName") && (
          <DataTableFacetedFilter
            column={table.getColumn("ServiceName")}
            title="Service"
            onFilterChange={(value) => handleFilterChange("ServiceName", value)}
            selectedValue={searchParams.get("ServiceName") || undefined}
          />
        )}
        {table.getColumn("StatusCode") && (
          <DataTableFacetedFilter
            column={table.getColumn("StatusCode")}
            title="Status"
            onFilterChange={(value) => handleFilterChange("StatusCode", value)}
            selectedValue={searchParams.get("StatusCode") || undefined}
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

