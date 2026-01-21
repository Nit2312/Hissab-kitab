import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('session-token')?.value;
  const pathname = request.nextUrl.pathname;

  // Skip middleware for API routes
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Protect dashboard routes - just check if session token exists
  // Actual session verification happens in server components
  if (pathname.startsWith('/dashboard')) {
    if (!sessionToken) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(url);
    }
  }

  // Redirect logged in users away from auth pages
  // Just check if session token exists, verification happens in pages
  if ((pathname === '/login' || pathname === '/signup') && sessionToken) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
