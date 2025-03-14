"use client"

import { useSearchParams } from "next/navigation"
import { TracesCountDisplay } from "./traces-count-display"
import { useTraces } from "@/hooks/use-traces"

export function TracesCount() {
  const searchParams = useSearchParams()

  // Pull the same params you use in the TracesTable
  const page = Number(searchParams.get("page") || "1")
  const pageSize = Number(searchParams.get("pageSize") || "10")
  const sort = searchParams.get("sort") || ""
  const filters = Object.fromEntries(
    Array.from(searchParams.entries()).filter(([key]) => !["page", "pageSize", "sort"].includes(key)),
  )

  // Leverage the same hook
  const { totalCount, isLoading } = useTraces({
    page,
    pageSize,
    sort,
    filters,
  })

  return (
    <TracesCountDisplay count={totalCount} isLoading={isLoading} />
  )
}
