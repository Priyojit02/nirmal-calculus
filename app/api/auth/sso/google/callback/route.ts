import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { COOKIE_NAME, signToken } from '@/lib/auth';
import { getSuperAdminEmail } from '@/lib/superAdmin';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const savedState = req.cookies.get('sso_state')?.value;

  const failRedirect = (msg: string) => {
    const url = new URL('/login', req.url);
    url.searchParams.set('error', msg);
    return NextResponse.redirect(url);
  };

  if (!code || !state || !savedState || state !== savedState) {
    return failRedirect('Invalid or expired Google SSO state.');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const redirectUri = `${appUrl.replace(/\/+$/, '')}/api/auth/sso/google/callback`;

  if (!clientId || !clientSecret) {
    return failRedirect('Google SSO credentials are missing.');
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenRes.ok || !tokenData.access_token) {
      return failRedirect('Failed to exchange Google OAuth code.');
    }

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profile = (await userRes.json()) as {
      email?: string;
      name?: string;
    };

    if (!profile.email) {
      return failRedirect('Google account did not provide an email.');
    }

    const email = profile.email.toLowerCase().trim();
    const isSuperAdmin = email === getSuperAdminEmail();

    await connectDB();
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: (profile.name || email.split('@')[0]).slice(0, 60),
        email,
        role: isSuperAdmin ? 'super_admin' : 'user',
        provider: 'google',
      });
    } else if (isSuperAdmin && user.role !== 'super_admin') {
      user.role = 'super_admin';
      await user.save();
    }

    const jwt = await signToken({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    });

    const res = NextResponse.redirect(
      new URL(user.role === 'super_admin' ? '/admin' : '/dashboard', req.url)
    );
    res.cookies.delete('sso_state');
    res.cookies.set(COOKIE_NAME, jwt, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return res;
  } catch (err) {
    console.error('Google SSO error:', err);
    return failRedirect('Google SSO authentication failed.');
  }
}
