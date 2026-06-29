import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // We can check for a cookie if we were using httpOnly cookies, 
  // but since we are using localStorage via Zustand persist for the token,
  // Next.js Edge middleware cannot access localStorage.
  // We will let the client components handle the actual redirect if unauthenticated,
  // or we can use a cookie approach for the token.
  
  // For this implementation, since we rely on Zustand local storage, 
  // we will add a small client-side layout protection for the dashboard.
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
