import { Suspense } from "react"
import { TracesFilters } from "@/components/traces/traces-filters"
import { TracesTableSkeleton } from "@/components/traces/traces-table-skeleton"
import { TracesTableWrapper } from "@/components/traces/traces-table-wrapper"
import { TracesCount } from "@/components/traces/traces-count"
import { TracesSlidingWindowChart } from "@/components/traces/traces-sliding-window-chart"

export default function TracesPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Traces</h1>
        <p className="text-muted-foreground">View and analyze distributed traces across your services.</p>
      </div>

      {/* Row with smaller TracesCount + Chart side by side */}
      <div className="flex flex-col-reverse lg:flex-row gap-4">
        <div className="flex-1">
          {/* Chart */}
          <Suspense fallback={<p>Loading chart...</p>}>
            <TracesSlidingWindowChart />
          </Suspense>
        </div>
        {/* Keep the count display small */}
        <div className="w-full lg:w-[300px] shrink-0">
          <Suspense fallback={<div className="h-16 bg-muted/50 rounded animate-pulse" />}>
            <div className="max-w-sm">
              <TracesCount />
            </div>
          </Suspense>
        </div>
      </div>

      {/* Traces Filters */}
      <Suspense fallback={<div className="h-9 w-full max-w-sm bg-muted rounded animate-pulse" />}>
        <TracesFilters />
      </Suspense>

      {/* Traces Table */}
      <Suspense fallback={<TracesTableSkeleton />}>
        <TracesTableWrapper />
      </Suspense>
    </div>
  )
}

export const dynamic = "force-dynamic"
