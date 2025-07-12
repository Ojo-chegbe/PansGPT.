import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { NextRequestWithAuth } from 'next-auth/middleware';
// Removed: import { prisma } from '@/lib/prisma';

// Paths that are always public
const publicPaths = ['/', '/login', '/signup', '/forgot-password', '/reset-password'];

export default async function middleware(request: NextRequestWithAuth) {
  const token = await getToken({ req: request });
  const path = request.nextUrl.pathname;

  // Safety check: Don't run middleware on API routes
  if (path.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Validate token if it exists (no DB call, just check for error)
  let isValidToken = false;
  if (token) {
    isValidToken = !token.error;
  }

  // Allow public pages for everyone
  if (publicPaths.includes(path)) {
    // If user is authenticated and tries to access login or signup, redirect to main
    if (token && isValidToken && (path === '/login' || path === '/signup')) {
    return NextResponse.redirect(new URL('/main', request.url));
    }
    return NextResponse.next();
  }

  // If not authenticated or token is invalid, redirect to login for all other pages
  if (!token || !isValidToken) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(url);
  }

  // Only check subscription for authenticated users on protected pages
  // Skip subscription check for plan page to avoid redirect loops
  if (path !== '/plan') {
    try {
      const response = await fetch(`${request.nextUrl.origin}/api/subscription/status`, {
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      });

      if (response.ok) {
      const data = await response.json();

        // If no active subscription and not a trial, or trial expired, redirect to plan
        if ((!data.isActive && !data.isTrial) || (data.isTrial && new Date(data.trialEndDate) < new Date())) {
        return NextResponse.redirect(new URL('/plan', request.url));
      }
      } else {
        // If subscription check fails, allow the request through
        // This prevents blocking users when the API is down
        console.error('Subscription check failed:', response.status);
        return NextResponse.next();
      }
    } catch (error) {
      // If subscription check throws an error, allow the request through
      // This prevents blocking users when there are network issues
      console.error('Error checking subscription:', error);
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  // Match all pages except static assets and API routes
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|logo|uploads).*)',
  ],
}; 