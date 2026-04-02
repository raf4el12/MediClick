import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/reset-password', '/'];
const AUTH_ONLY_PATHS = ['/login', '/register', '/forgot-password', '/reset-password'];

function getRoleFromToken(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1] as string));
    return (payload.roleName as string) ?? null;
  } catch {
    return null;
  }
}

function getDefaultRoute(role: string | null): string {
  if (role === 'PATIENT') return '/patient';
  return '/dashboard';
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('accessToken')?.value;

  const isPublicPath =
    pathname === '/' || PUBLIC_PATHS.some((path) => path !== '/' && pathname.startsWith(path));

  // Authenticated user visiting auth pages → redirect based on role
  if (AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p)) && accessToken) {
    const role = getRoleFromToken(accessToken);
    return NextResponse.redirect(new URL(getDefaultRoute(role), request.url));
  }

  // Unauthenticated user visiting protected route → redirect to login
  if (!isPublicPath && !accessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|images|favicon.ico).*)'],
};
