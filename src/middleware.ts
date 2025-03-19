// src/middleware.ts
import { NextRequest, NextResponse, after } from 'next/server';
import { trace } from '@opentelemetry/api';
import NextAuth from 'next-auth';
import { logger } from './lib/logger';

import { authConfig } from '@/app/(auth)/auth.config';

// Get the auth middleware
const authMiddleware = NextAuth(authConfig).auth;

// Create a wrapper function that adds OpenTelemetry tracing
export default async function middleware(request: NextRequest) {
  const requestStartTime = Date.now();
  
  // Capture request details before processing
  const requestDetails = {
    url: request.url,
    method: request.method,
    nextUrl: {
      pathname: request.nextUrl.pathname,
      searchParams: Object.fromEntries(request.nextUrl.searchParams.entries()),
      host: request.nextUrl.host,
      hostname: request.nextUrl.hostname,
      port: request.nextUrl.port,
      protocol: request.nextUrl.protocol,
    },
    headers: Object.fromEntries(request.headers.entries()),
    cookies: Object.fromEntries(request.cookies.getAll().map(c => [c.name, c.value])),
    traceId: trace.getActiveSpan()?.spanContext().traceId,
    spanId: trace.getActiveSpan()?.spanContext().spanId,
  };
  
  // Try to get request body if available (note: may not be available for all requests)
  let requestBody = null;
  try {
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      // Clone the request to read the body without consuming it
      const clonedRequest = request.clone();
      const contentType = request.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        try {
          requestBody = await clonedRequest.json();
        } catch (e) {
          requestBody = { error: 'Could not parse JSON body' };
        }
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        try {
          const formData = await clonedRequest.formData();
          requestBody = Object.fromEntries(formData);
        } catch (e) {
          requestBody = { error: 'Could not parse form data' };
        }
      } else if (contentType.includes('text/')) {
        try {
          requestBody = await clonedRequest.text();
        } catch (e) {
          requestBody = { error: 'Could not read text body' };
        }
      }
    }
  } catch (error) {
    requestBody = { error: 'Error accessing request body' };
  }
  
  // Call the original auth middleware
  const authResult = await authMiddleware(request as any);
  
  // If auth middleware returned a response (like a redirect), add tracing to it
  if (authResult) {
    const current = trace.getActiveSpan();
    
    // Check if authResult is a Response object
    if (authResult instanceof Response) {
      if (current) {
        authResult.headers.set(
          'server-timing', 
          `traceparent;desc="00-${current.spanContext().traceId}-${current.spanContext().spanId}-01"`
        );
      }
      
      // Capture response details for auth redirects
      const responseDetails = {
        status: authResult.status,
        statusText: authResult.statusText,
        headers: Object.fromEntries(authResult.headers.entries()),
        redirected: authResult.redirected,
        type: authResult.type,
        url: authResult.url,
      };
      
      after(() => {
        const requestDuration = Date.now() - requestStartTime;
        logger.info('Request completed', {
          request: {
            ...requestDetails,
            body: requestBody,
          },
          response: responseDetails,
          performance: {
            durationMs: requestDuration,
            timestamp: new Date().toISOString(),
          }
        });
      });
      
      return authResult;
    } else {
      // Handle case where authResult is not a Response (e.g., it's a Session)
      after(() => {
        const requestDuration = Date.now() - requestStartTime;
        logger.info('Request completed', {
          request: {
            ...requestDetails,
            body: requestBody,
          },
          auth: {
            result: typeof authResult === 'object' ? 
              // Safely extract serializable properties
              JSON.parse(JSON.stringify(authResult)) : 
              { value: authResult }
          },
          performance: {
            durationMs: requestDuration,
            timestamp: new Date().toISOString(),
          }
        });
      });
      
      // Continue with normal flow
    }
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

  // Capture response details
  const responseDetails = {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    redirected: response.redirected,
    type: response.type,
    url: response.url,
  };

  after(() => {
    const requestDuration = Date.now() - requestStartTime;
    logger.info('Request completed', {
      request: {
        ...requestDetails,
        body: requestBody,
      },
      response: responseDetails,
      performance: {
        durationMs: requestDuration,
        timestamp: new Date().toISOString(),
      }
    });
  });
  
  return response;
}

// Keep the existing matcher configuration
export const config = {
  matcher: ['/frontend', '/frontend/:id', '/frontend/api/:path*', '/frontend/login', '/frontend/register'],
  runtime: 'nodejs',
};