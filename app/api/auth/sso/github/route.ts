import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  if (!clientId || !process.env.GITHUB_CLIENT_SECRET) {
    const url = new URL('/login', req.url);
    url.searchParams.set(
      'error',
      'GitHub SSO is not configured yet. Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env.local.'
    );
    return NextResponse.redirect(url);
  }

  const state = crypto.randomUUID();
  const redirectUri = `${appUrl.replace(/\/+$/, '')}/api/auth/sso/github/callback`;

  const authUrl = new URL('https://github.com/login/oauth/authorize');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'read:user user:email');
  authUrl.searchParams.set('state', state);

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set('sso_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  return res;
}
