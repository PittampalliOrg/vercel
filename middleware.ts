import NextAuth from 'next-auth';
import { authConfig } from '@/app/(auth)/auth.config';

export default NextAuth(authConfig).auth;

// Configure the matcher to exclude static assets
export const config = {
  matcher: [
    // These paths are relative to the basePath
    '/',
    '/:path*',
    '/api/:path*',
    '/login',
    '/register',
    
    // Explicitly exclude static assets and API routes
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
};