import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { COOKIE_NAME, getUser, signToken } from '@/lib/auth';

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  return NextResponse.json({ user });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      action?: string;
      name?: string;
      email?: string;
      password?: string;
    };

    if (body.action === 'logout') {
      const res = NextResponse.json({ ok: true });
      res.cookies.delete(COOKIE_NAME);
      return res;
    }

    await connectDB();

    const email = String(body.email ?? '').toLowerCase().trim();
    const password = String(body.password ?? '');

    if (!email.includes('@') || password.length < 6) {
      return badRequest('Enter a valid email and a password of at least 6 characters.');
    }

    let user = await User.findOne({ email });

    if (body.action === 'register') {
      const name = String(body.name ?? '').trim();
      if (name.length < 2) {
        return badRequest('Enter your full name (at least 2 characters).');
      }
      if (user) {
        return badRequest('An account with this email already exists.', 409);
      }

      const passwordHash = await bcrypt.hash(password, 10);
      user = await User.create({
        name: name.slice(0, 60),
        email,
        passwordHash,
      });
    } else {
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return badRequest('Invalid email or password.', 401);
      }
    }

    const token = await signToken({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    });

    const res = NextResponse.json({
      ok: true,
      token,
      user: { id: user._id.toString(), name: user.name, email: user.email },
    });

    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return res;
  } catch (err) {
    console.error('Auth API error:', err);
    return badRequest('Authentication service error. Check database connection.', 500);
  }
}
