// vercel/app/(chat)/api/[[...route]]/route.ts

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Adjust to the actual URL where your Hono backend is hosted
const HONO_BACKEND_URL = process.env.HONO_BACKEND_URL || 'http://api:8000'

export async function GET(req: NextRequest) {
  const { pathname, searchParams } = new URL(req.url)

  // The path after `/api/`, because your catch-all folder is `[...route]`
  // If your Next.js route is /api/xxx, then `pathname.replace('/api', '')` is 'xxx'
  const path = pathname.replace('/api', '')

  // Construct the URL to your Hono server
  const targetUrl = `${HONO_BACKEND_URL}${path}?${searchParams.toString()}`

  // Forward the request headers if needed
  const headers = new Headers(req.headers)

  // Proxy the request to the Hono server
  const response = await fetch(targetUrl, {
    method: 'GET',
    headers,
  })

  // Return the response directly
  return new NextResponse(response.body, {
    status: response.status,
    headers: response.headers,
  })
}

export async function POST(req: NextRequest) {
  // For POST (and similarly for PATCH, PUT, DELETE, etc.):
  const { pathname, searchParams } = new URL(req.url)
  const path = pathname.replace('/api', '')
  const targetUrl = `${HONO_BACKEND_URL}${path}?${searchParams.toString()}`

  // We forward the body and headers
  const headers = new Headers(req.headers)
  const body = await req.blob() // or req.arrayBuffer(), req.text(), etc. depending on your data

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers,
    body,
  })

  return new NextResponse(response.body, {
    status: response.status,
    headers: response.headers,
  })
}

export async function PATCH(req: NextRequest) {
  const { pathname, searchParams } = new URL(req.url)
  const path = pathname.replace('/api', '')
  const targetUrl = `${HONO_BACKEND_URL}${path}?${searchParams.toString()}`

  const headers = new Headers(req.headers)
  const body = await req.blob()

  const response = await fetch(targetUrl, {
    method: 'PATCH',
    headers,
    body,
  })

  return new NextResponse(response.body, {
    status: response.status,
    headers: response.headers,
  })
}
