import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, verifyToken } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isApiProtected =
    pathname.startsWith('/api/attempts') ||
    /^\/api\/problems\/[^/]+\/bookmark$/.test(pathname);

  const isPageProtected =
    pathname.startsWith('/dashboard') || /^\/tests\/[^/]+$/.test(pathname);

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

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/tests/:slug+',
    '/api/attempts/:path*',
    '/api/problems/:slug/bookmark',
  ],
};
