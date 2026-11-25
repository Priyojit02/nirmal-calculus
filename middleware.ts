import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, verifyToken } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow Next.js internals, static assets, login page, auth APIs, and health check
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/login' ||
    pathname.startsWith('/api/auth') ||
    pathname === '/api/health'
  ) {
    return NextResponse.next();
  }

  const isApi = pathname.startsWith('/api/');
  const isAdminApi = pathname.startsWith('/api/admin');
  const isAdminPage = pathname.startsWith('/admin');

  const bearer = req.headers.get('authorization')?.startsWith('Bearer ')
    ? req.headers.get('authorization')!.slice(7).trim()
    : null;
  const cookieToken = req.cookies.get(COOKIE_NAME)?.value ?? null;
  const token = bearer || cookieToken;

  const user = token ? await verifyToken(token) : null;

  if (!user) {
    if (isApi) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid JWT required.' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', req.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  if ((isAdminApi || isAdminPage) && user.role !== 'super_admin') {
    if (isAdminApi) {
      return NextResponse.json(
        { error: 'Forbidden: Super Admin role required.' },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
