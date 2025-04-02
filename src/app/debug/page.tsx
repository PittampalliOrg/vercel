import { PageHeader } from "@/components/navigation/page-header"

export default function DebugPage() {
  return (
    <div className="container py-6">
      <PageHeader heading="Debug Console" description="Monitor and troubleshoot your AI chatbot" />

      <div className="mt-8 grid gap-6">
        {/* Debug content goes here */}
        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-medium">System Status</h2>
          <div className="mt-4 grid gap-4">
            <div className="flex items-center justify-between rounded-md bg-muted p-3">
              <span>API Connection</span>
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-300">
                Connected
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted p-3">
              <span>Model Status</span>
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-300">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted p-3">
              <span>Database</span>
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-300">
                Connected
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

