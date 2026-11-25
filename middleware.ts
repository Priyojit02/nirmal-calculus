import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, verifyToken } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminApi = pathname.startsWith('/api/admin');
  const isAdminPage = pathname.startsWith('/admin');

  const isApiProtected =
    isAdminApi ||
    pathname.startsWith('/api/attempts') ||
    /^\/api\/problems\/[^/]+\/bookmark$/.test(pathname);

  const isPageProtected =
    isAdminPage ||
    pathname.startsWith('/dashboard') ||
    /^\/tests\/[^/]+$/.test(pathname);

  if (!isApiProtected && !isPageProtected) {
    return NextResponse.next();
  }

  const bearer = req.headers.get('authorization')?.startsWith('Bearer ')
    ? req.headers.get('authorization')!.slice(7).trim()
    : null;
  const cookieToken = req.cookies.get(COOKIE_NAME)?.value ?? null;
  const token = bearer || cookieToken;

  const user = token ? await verifyToken(token) : null;

  if (!user) {
    if (isApiProtected) {
      return NextResponse.json(
        { error: 'Unauthorized: Valid JWT required.' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname);
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
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/tests/:slug+',
    '/api/admin/:path*',
    '/api/attempts/:path*',
    '/api/problems/:slug/bookmark',
  ],
};
