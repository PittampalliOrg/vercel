import { Suspense } from "react"
import { TracesTableSkeleton } from "@/components/traces/traces-table-skeleton"
import { TracesFilters } from "@/components/traces/traces-filters"
import { TracesTableWrapper } from "@/components/traces/traces-table-wrapper"

export default function TracesPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Traces</h1>
        <p className="text-muted-foreground">View and analyze distributed traces across your services.</p>
      </div>

      <Suspense fallback={<div className="h-9 w-full max-w-sm bg-muted rounded animate-pulse" />}>
        <TracesFilters />
      </Suspense>

      <Suspense fallback={<TracesTableSkeleton />}>
        <TracesTableWrapper />
      </Suspense>
    </div>
  )
}

// Tell Next.js this is a dynamic route that should not be prerendered
export const dynamic = "force-dynamic"

