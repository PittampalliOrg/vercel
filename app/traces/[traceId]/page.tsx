import { Suspense } from "react"
import { TraceDetail } from "@/components/traces/trace-detail"
import { TraceDetailSkeleton } from "@/components/traces/trace-detail-skeleton"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface TraceDetailPageProps {
  params: Promise<{
    traceId: string
  }>
}

export default async function TraceDetailPage({ params }: TraceDetailPageProps) {
  // Await the params Promise to get the actual values
  const { traceId } = await params

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/traces">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to traces</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trace Details</h1>
          <p className="text-muted-foreground">
            Trace ID: <span className="font-mono">{traceId}</span>
          </p>
        </div>
      </div>

      <Suspense fallback={<TraceDetailSkeleton />}>
        <TraceDetail traceId={traceId} />
      </Suspense>
    </div>
  )
}

