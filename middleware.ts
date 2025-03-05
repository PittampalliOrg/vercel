// middleware.ts
import NextAuth from 'next-auth';
import { authConfig } from '@/app/(auth)/auth.config';
import { withTraceAndLoggingNextAuth } from '@/lib/withTraceAndLoggingNextAuth';

// Original NextAuth handler
const originalAuthMiddleware = NextAuth(authConfig).auth;

// Wrap it in our specialized NextAuth HOF
export default withTraceAndLoggingNextAuth(originalAuthMiddleware);

// Node runtime for this middleware
export const config = {
  matcher: ['/', '/:id', '/api/:path*', '/login', '/register'],
};
