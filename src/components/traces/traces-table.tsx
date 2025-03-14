"use client"

import { useState } from "react"
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
import { DataTablePagination } from "./data-table-pagination"
import { DataTableToolbar } from "./data-table-toolbar"
import { useSearchParams, usePathname, useRouter } from "next/navigation"
import { useTraces } from "@/hooks/use-traces"
import { formatDuration } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export function TracesTable() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()

  const page = Number(searchParams.get("page") || "1")
  const pageSize = Number(searchParams.get("pageSize") || "10")
  const sort = searchParams.get("sort") || ""
  const filters = Object.fromEntries(
    Array.from(searchParams.entries()).filter(([key]) => !["page", "pageSize", "sort"].includes(key)),
  )

  const { traces, totalCount, isLoading, error } = useTraces({
    page,
    pageSize,
    sort,
    filters,
  })

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "Timestamp",
      header: "Timestamp",
      cell: ({ row }) => {
        return new Date(row.getValue("Timestamp")).toLocaleString()
      },
    },
    {
      accessorKey: "TraceId",
      header: "Trace ID",
      cell: ({ row }) => {
        const traceId = row.getValue("TraceId") as string
        return <span className="font-mono text-xs">{traceId.substring(0, 8)}...</span>
      },
    },
    {
      accessorKey: "SpanName",
      header: "Span Name",
    },
    {
      accessorKey: "ServiceName",
      header: "Service",
    },
    {
      accessorKey: "Duration",
      header: "Duration",
      cell: ({ row }) => {
        return formatDuration(row.getValue("Duration"))
      },
    },
    {
      accessorKey: "StatusCode",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("StatusCode") as string
        return (
          <div className="flex items-center">
            <div
              className={`h-2 w-2 rounded-full mr-2 ${
                status === "OK" ? "bg-green-500" : status === "ERROR" ? "bg-red-500" : "bg-yellow-500"
              }`}
            />
            {status}
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: traces,
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

  function updateSearchParams(newParams: Record<string, string | null>) {
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
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load traces: {error.message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      <DataTableToolbar table={table} />
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
                    // Navigate to trace detail page
                    window.location.href = `/traces/${row.getValue("TraceId")}`
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

