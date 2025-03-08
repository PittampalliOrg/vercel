"use client"

import { useState, useCallback } from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DataTablePagination } from "@/components/traces/data-table-pagination"
import { LogsTableToolbar } from "./logs-table-toolbar"
import { useSearchParams, usePathname, useRouter } from "next/navigation"
import { useLogs } from "@/hooks/use-logs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function LogsTable() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()

  const page = Number(searchParams.get("page") || "1")
  const pageSize = Number(searchParams.get("pageSize") || "10")
  const sort = searchParams.get("sort") || ""

  // Extract time range
  // Extract lookback parameter
  const lookback = searchParams.get("lookback") || "1h"

  // Extract other filters
  const filters = Object.fromEntries(
    Array.from(searchParams.entries()).filter(
      ([key]) => !["page", "pageSize", "sort", "startTime", "endTime"].includes(key),
    ),
  )

  const { logs, totalCount, isLoading, error } = useLogs({
    page,
    pageSize,
    sort,
    filters,
    lookback,
  })

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "TimestampTime",
      header: "Timestamp",
      cell: ({ row }) => {
        return new Date(row.getValue("TimestampTime")).toLocaleString()
      },
    },
    {
      accessorKey: "SeverityText",
      header: "Severity",
      cell: ({ row }) => {
        const severity = row.getValue("SeverityText") as string

        // Handle empty severity values
        if (!severity) {
          return <Badge variant="outline">NONE</Badge>
        }

        return (
          <Badge
            variant={
              severity === "ERROR"
                ? "destructive"
                : severity === "WARN"
                  ? "secondary"
                  : severity === "INFO"
                    ? "secondary"
                    : "outline"
            }
            className={severity === "WARN" ? "bg-yellow-500 hover:bg-yellow-500/80" : undefined}
          >
            {severity}
          </Badge>
        )
      },
    },
    {
      accessorKey: "ServiceName",
      header: "Service",
    },
    {
      accessorKey: "Body",
      header: "Message",
      cell: ({ row }) => {
        const body = row.getValue("Body") as string
        // Truncate long messages for better display
        return <div className="max-w-md truncate">{body}</div>
      },
    },
    {
      accessorKey: "TraceId",
      header: "Trace ID",
      cell: ({ row }) => {
        const traceId = row.getValue("TraceId") as string
        if (!traceId) return <span className="text-muted-foreground">-</span>
        return <span className="font-mono text-xs">{traceId.substring(0, 8)}...</span>
      },
    },
  ]

  const table = useReactTable({
    data: logs,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: true,
    pageCount: Math.ceil(totalCount / pageSize),
  })

  // Memoize the updateSearchParams function to prevent recreating it on every render
  const updateSearchParams = useCallback(
    (newParams: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())

      // Update or remove params
      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null) {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })

      replace(`${pathname}?${params.toString()}`)
    },
    [searchParams, pathname, replace],
  )

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load logs: {error.message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <LogsTableToolbar table={table} />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j} className="h-16">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    // Navigate to log detail page
                    window.location.href = `/logs/${encodeURIComponent(row.getValue("Timestamp"))}`
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination
        table={table}
        onPageChange={(page) => updateSearchParams({ page: String(page) })}
        onPageSizeChange={(size) => updateSearchParams({ pageSize: String(size), page: "1" })}
      />
    </div>
  )
}

