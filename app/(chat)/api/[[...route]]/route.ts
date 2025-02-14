// vercel/app/(chat)/api/[[...route]]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { trace, SpanStatusCode } from '@opentelemetry/api';

export const runtime = 'nodejs';

const HONO_BACKEND_URL = process.env.HONO_BACKEND_URL || 'http://api:8000';

export async function GET(req: NextRequest) {
  const tracer = trace.getTracer('server-tracer');
  return tracer.startActiveSpan('GET /api/[...route]', async (span) => {
    try {
      span.setAttribute('source.file', 'app/(chat)/api/[[...route]]/route.ts:15');
      span.addEvent('Proxying GET to HONO');

      const { pathname, searchParams } = new URL(req.url);
      const path = pathname.replace('/api', '');
      const targetUrl = `${HONO_BACKEND_URL}${path}?${searchParams.toString()}`;

      const headers = new Headers(req.headers);
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers,
      });

      return new NextResponse(response.body, {
        status: response.status,
        headers: response.headers,
      });
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      return NextResponse.json({ error: 'Proxy GET error' }, { status: 500 });
    } finally {
      const traceId = span.spanContext().traceId;
      const spanId = span.spanContext().spanId;

      span.end();
    }
  });
}

export async function POST(req: NextRequest) {
  const tracer = trace.getTracer('server-tracer');
  return tracer.startActiveSpan('POST /api/[...route]', async (span) => {
    try {
      span.setAttribute('source.file', 'app/(chat)/api/[[...route]]/route.ts:48');
      span.addEvent('Proxying POST to HONO');

      const { pathname, searchParams } = new URL(req.url);
      const path = pathname.replace('/api', '');
      const targetUrl = `${HONO_BACKEND_URL}${path}?${searchParams.toString()}`;

      const headers = new Headers(req.headers);
      const body = await req.blob();

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers,
        body,
      });

      return new NextResponse(response.body, {
        status: response.status,
        headers: response.headers,
      });
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      return NextResponse.json({ error: 'Proxy POST error' }, { status: 500 });
    } finally {
      const traceId = span.spanContext().traceId;
      const spanId = span.spanContext().spanId;

      span.end();
    }
  });
}

export async function PATCH(req: NextRequest) {
  const tracer = trace.getTracer('server-tracer');
  return tracer.startActiveSpan('PATCH /api/[...route]', async (span) => {
    try {
      span.setAttribute('source.file', 'app/(chat)/api/[[...route]]/route.ts:82');
      span.addEvent('Proxying PATCH to HONO');

      const { pathname, searchParams } = new URL(req.url);
      const path = pathname.replace('/api', '');
      const targetUrl = `${HONO_BACKEND_URL}${path}?${searchParams.toString()}`;

      const headers = new Headers(req.headers);
      const body = await req.blob();

      const response = await fetch(targetUrl, {
        method: 'PATCH',
        headers,
        body,
      });

      return new NextResponse(response.body, {
        status: response.status,
        headers: response.headers,
      });
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      return NextResponse.json({ error: 'Proxy PATCH error' }, { status: 500 });
    } finally {
      const traceId = span.spanContext().traceId;
      const spanId = span.spanContext().spanId;

      span.end();
    }
  });
}
