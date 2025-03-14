import { Suspense } from "react"
import { LogsTableSkeleton } from "@/components/logs/logs-table-skeleton"
import { LogsFilters } from "@/components/logs/logs-filters"
import { LogsTableWrapper } from "@/components/logs/logs-table-wrapper"

export default function LogsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Logs</h1>
        <p className="text-muted-foreground">View and analyze logs across your services.</p>
      </div>

      <Suspense fallback={<div className="h-9 w-full max-w-sm bg-muted rounded animate-pulse" />}>
        <LogsFilters />
      </Suspense>

      <Suspense fallback={<LogsTableSkeleton />}>
        <LogsTableWrapper />
      </Suspense>
    </div>
  )
}

// Tell Next.js this is a dynamic route that should not be prerendered
export const dynamic = "force-dynamic"

