import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function LogDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-[200px] bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>

      <Tabs defaultValue="attributes">
        <TabsList>
          <TabsTrigger value="attributes">Log Attributes</TabsTrigger>
          <TabsTrigger value="resource">Resource Attributes</TabsTrigger>
          <TabsTrigger value="scope">Scope Attributes</TabsTrigger>
        </TabsList>
        <TabsContent value="attributes" className="p-4 border rounded-md mt-2">
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-4 w-40 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

