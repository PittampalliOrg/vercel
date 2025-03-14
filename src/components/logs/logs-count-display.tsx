import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileTextIcon } from "lucide-react"

interface LogsCountDisplayProps {
  count: number
  isLoading?: boolean
}

export function LogsCountDisplay({ count, isLoading = false }: LogsCountDisplayProps) {
  // Format the count with commas for thousands
  const formattedCount = new Intl.NumberFormat().format(count)

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-full">
            <FileTextIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Total Logs</h3>
            {isLoading ? (
              <div className="h-7 w-24 bg-muted animate-pulse rounded-md mt-1"></div>
            ) : (
              <p className="text-2xl font-bold">{formattedCount}</p>
            )}
          </div>
        </div>
        <Badge variant="outline" className="text-xs px-2 py-1 bg-primary/5">
          Matching Logs
        </Badge>
      </CardContent>
    </Card>
  )
}

