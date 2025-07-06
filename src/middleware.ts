import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { NextRequestWithAuth } from 'next-auth/middleware';

// Define paths that require authentication (and potentially subscription)
const protectedPaths = [
  '/main',
  '/practice',
  '/study-materials',
  // Add other routes here that directly require a user to be logged in
];

export default async function middleware(request: NextRequestWithAuth) {
  const token = await getToken({ req: request });
  const path = request.nextUrl.pathname;

  // If user is authenticated AND trying to access the login page, redirect to main
  // The root path '/' is handled by src/app/page.tsx which redirects to /main if authenticated.
  if (token && path === '/login') {
    return NextResponse.redirect(new URL('/main', request.url));
  }

  // If user is NOT authenticated AND trying to access a protected path, redirect to login
  const isProtectedPath = protectedPaths.some(p => path.startsWith(p));
  if (!token && isProtectedPath) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', path);
    return NextResponse.redirect(url);
  }

  // If authenticated, check subscription status for premium paths
  if (token && isProtectedPath) { // Only check subscription if it's a protected path and user is authenticated
    try {
      const response = await fetch(`${request.nextUrl.origin}/api/subscription/status`, {
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      });

      const data = await response.json();

      // If no active subscription and not a trial, redirect to plan page
      if (!data.isActive && !data.isTrial) {
        return NextResponse.redirect(new URL('/plan', request.url));
      }

      // If trial is expired, redirect to plan page
      if (data.isTrial && new Date(data.trialEndDate) < new Date()) {
        return NextResponse.redirect(new URL('/plan', request.url));
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  // Match ONLY the paths that require middleware logic (auth or subscription check)
  matcher: [
    '/main/:path*',
    '/practice/:path*',
    '/study-materials/:path*',
    '/login', // Keep login here to redirect *authenticated* users away from it.
  ],
}; 