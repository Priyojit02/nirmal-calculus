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
    return failRedirect('Invalid or expired GitHub SSO state.');
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return failRedirect('GitHub SSO credentials are missing.');
  }

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenRes.ok || !tokenData.access_token) {
      return failRedirect('Failed to exchange GitHub OAuth code.');
    }

    const [userRes, emailsRes] = await Promise.all([
      fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/vnd.github+json',
        },
      }),
      fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/vnd.github+json',
        },
      }),
    ]);

    const profile = (await userRes.json()) as {
      name?: string;
      login?: string;
      email?: string;
    };
    const emails = (await emailsRes.json()) as Array<{
      email: string;
      primary: boolean;
      verified: boolean;
    }>;

    const primaryEmail =
      Array.isArray(emails)
        ? emails.find((e) => e.primary && e.verified)?.email ||
          emails.find((e) => e.verified)?.email
        : profile.email;

    if (!primaryEmail) {
      return failRedirect('GitHub account has no verified email.');
    }

    const email = primaryEmail.toLowerCase().trim();
    const isSuperAdmin = email === getSuperAdminEmail();

    await connectDB();
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: (profile.name || profile.login || email.split('@')[0]).slice(0, 60),
        email,
        role: isSuperAdmin ? 'super_admin' : 'user',
        provider: 'github',
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
    console.error('GitHub SSO error:', err);
    return failRedirect('GitHub SSO authentication failed.');
  }
}
