import { Suspense } from "react"
import { LogDetail } from "@/components/logs/log-detail"
import { LogDetailSkeleton } from "@/components/logs/log-detail-skeleton"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"


export default async function LogDetailPage({ params }: { params: Promise<{  timestamp: string }> }) {
  const { timestamp } = await params
  const decodedTimestamp = decodeURIComponent(timestamp)

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/logs">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back to logs</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Log Details</h1>
          <p className="text-muted-foreground">
            Timestamp: <span className="font-mono">{decodedTimestamp}</span>
          </p>
        </div>
      </div>

      <Suspense fallback={<LogDetailSkeleton />}>
        <LogDetail timestamp={decodedTimestamp} />
      </Suspense>
    </div>
  )
}

// Tell Next.js this is a dynamic route that should not be prerendered
export const dynamic = "force-dynamic"

