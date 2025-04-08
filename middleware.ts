import { NextRequest, NextResponse } from 'next/server';
import { trace } from '@opentelemetry/api';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if user is authenticated
  const token = await getToken({ req: request });
  const isLoggedIn = !!token;
  
  // Define path patterns
  const isOnChat = pathname.startsWith('/frontend');
  const isOnRegister = pathname.startsWith('/frontend/register');
  const isOnLogin = pathname.startsWith('/frontend/login');
  
  // Authentication logic (similar to your auth.config.ts)
  if (isLoggedIn && (isOnLogin || isOnRegister)) {
    return NextResponse.redirect(new URL('/frontend', request.url));
  }
  
  if (isOnRegister || isOnLogin) {
    // Allow access to register and login pages
  } else if (isOnChat) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/frontend/login', request.url));
    }
  } else if (isLoggedIn) {
    return NextResponse.redirect(new URL('/frontend', request.url));
  }
  
  // If we reach here, the user is allowed to access the requested page
  // Create response and add telemetry
  const response = NextResponse.next();
  
  // Get the active span for telemetry
  const current = trace.getActiveSpan();

  // Set server-timing header with traceparent if a span exists
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
  matcher: ['/frontend', '/frontend/:id', '/frontend/api/:path*', '/frontend/login', '/frontend/register'],
};