import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { FileTextIcon } from "lucide-react"

export function LogsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="md:col-span-1">
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  <FileTextIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Total Logs</h3>
                  <div className="h-7 w-24 bg-muted animate-pulse rounded-md mt-1"></div>
                </div>
              </div>
              <div className="h-6 w-24 bg-muted animate-pulse rounded-md"></div>
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-9 w-[250px] bg-muted rounded animate-pulse" />
              <div className="h-9 w-[120px] bg-muted rounded animate-pulse" />
              <div className="h-9 w-[100px] bg-muted rounded animate-pulse" />
            </div>
            <div className="h-9 w-[100px] bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Trace ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell className="h-16">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted rounded animate-pulse" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted rounded animate-pulse" />
                </TableCell>
                <TableCell>
                  <div className="h-4 bg-muted rounded animate-pulse" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-2">
        <div className="flex-1 text-sm text-muted-foreground">
          <div className="h-4 w-[200px] bg-muted rounded animate-pulse" />
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <div className="h-4 w-[70px] bg-muted rounded animate-pulse" />
            <div className="h-8 w-[70px] bg-muted rounded animate-pulse" />
          </div>
          <div className="h-4 w-[100px] bg-muted rounded animate-pulse" />
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-muted rounded animate-pulse" />
            <div className="h-8 w-8 bg-muted rounded animate-pulse" />
            <div className="h-8 w-8 bg-muted rounded animate-pulse" />
            <div className="h-8 w-8 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}

