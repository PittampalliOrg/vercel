// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { trace } from '@opentelemetry/api';
import NextAuth from 'next-auth';

import { authConfig } from '@/app/(auth)/auth.config';

// Get the auth middleware
const authMiddleware = NextAuth(authConfig).auth;

// Create a wrapper function that adds OpenTelemetry tracing
export default async function middleware(request: NextRequest) {
  // Call the original auth middleware
  const authResult = await authMiddleware(request as any);
  
  // If auth middleware returned a response (like a redirect), add tracing to it
  if (authResult) {
    const current = trace.getActiveSpan();
    if (current && authResult instanceof Response) {
      authResult.headers.set(
        'server-timing', 
        `traceparent;desc="00-${current.spanContext().traceId}-${current.spanContext().spanId}-01"`
      );
    }
    return authResult;
  }
  
  // Otherwise, create a new response with tracing
  const response = NextResponse.next();
  const current = trace.getActiveSpan();
  if (current) {
    response.headers.set(
      'server-timing', 
      `traceparent;desc="00-${current.spanContext().traceId}-${current.spanContext().spanId}-01"`
    );
  }
  
  return response;
}

// Keep the existing matcher configuration
export const config = {
  matcher: ['/', '/:id', '/api/:path*', '/login', '/register'],
};