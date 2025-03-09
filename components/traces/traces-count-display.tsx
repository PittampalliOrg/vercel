import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity } from "lucide-react" // or any icon you prefer

interface TracesCountDisplayProps {
  count: number
  isLoading?: boolean
}

export function TracesCountDisplay({ count, isLoading = false }: TracesCountDisplayProps) {
  const formattedCount = new Intl.NumberFormat().format(count)

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-full">
            {/* You can replace <Activity /> with any icon you like */}
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Total Traces</h3>
            {isLoading ? (
              <div className="h-7 w-24 bg-muted animate-pulse rounded-md mt-1" />
            ) : (
              <p className="text-2xl font-bold">{formattedCount}</p>
            )}
          </div>
        </div>
        <Badge variant="outline" className="text-xs px-2 py-1 bg-primary/5">
          Matching Traces
        </Badge>
      </CardContent>
    </Card>
  )
}
