import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    const url = new URL('/login', req.url);
    url.searchParams.set(
      'error',
      'Google SSO is not configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local.'
    );
    return NextResponse.redirect(url);
  }

  const state = crypto.randomUUID();
  const redirectUri = `${appUrl.replace(/\/+$/, '')}/api/auth/sso/google/callback`;

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('prompt', 'select_account');

  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set('sso_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  return res;
}
