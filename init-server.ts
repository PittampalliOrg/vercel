'use server';
import { cookies } from 'next/headers';
import { context, trace } from '@opentelemetry/api';

export async function initHighlightServer() {
  const tracer = trace.getTracer('vercel-otel-tracer');
  const span = tracer.startSpan('initHighlightServer');

  // `cookies()` is asynchronous, so we await it
  const requestCookies = await cookies();

  // `requestCookies.get()` returns a cookie synchronously
  const sessionSecureID = requestCookies.get('sessionSecureID');

  // `trace.getSpan()` is synchronous
  const activeSpan = trace.getSpan(context.active());

  console.log('All cookies:', requestCookies.getAll());

  activeSpan?.setAttribute('highlight.session_id', sessionSecureID?.value || '');

  console.log('setting sessionSecureID', sessionSecureID?.value || 'missing');

  span.end();
}