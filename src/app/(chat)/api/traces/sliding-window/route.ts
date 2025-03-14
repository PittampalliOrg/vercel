import { NextResponse } from "next/server"
import { fetchTracesSlidingWindow } from "@/lib/clickhouse"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  // e.g. "2 HOUR" or "4 HOUR"
  const period = searchParams.get("period") || "2 HOUR"

  try {
    const data = await fetchTracesSlidingWindow(period)
    return NextResponse.json({ data })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Unknown error." },
      { status: 500 }
    )
  }
}
