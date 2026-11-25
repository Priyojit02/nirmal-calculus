import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, {
    bucket: 'reset-password',
    limit: 10,
    windowSeconds: 300,
  });
  if (limited) return limited;

  try {
    const body = (await req.json()) as {
      email?: string;
      code?: string;
      newPassword?: string;
    };

    const email = String(body.email ?? '').toLowerCase().trim();
    const code = String(body.code ?? '').trim();
    const newPassword = String(body.newPassword ?? '');

    if (!email.includes('@') || !code || newPassword.length < 6) {
      return NextResponse.json(
        {
          error:
            'Enter your email, the 6-digit verification code, and a new password (6+ chars).',
        },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findOne({ email });

    if (
      !user ||
      !user.resetCodeHash ||
      !user.resetCodeExpiresAt ||
      user.resetCodeExpiresAt.getTime() < Date.now()
    ) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code.' },
        { status: 400 }
      );
    }

    const codeHash = createHash('sha256').update(code).digest('hex');
    if (codeHash !== user.resetCodeHash) {
      return NextResponse.json(
        { error: 'Incorrect verification code. Please check your email.' },
        { status: 400 }
      );
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetCodeHash = undefined;
    user.resetCodeExpiresAt = undefined;
    // Clear active sessions so all old devices must re-authenticate
    user.activeSessions = [];
    await user.save();

    return NextResponse.json({
      ok: true,
      message: 'Password updated! You can now log in with your new password.',
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return NextResponse.json(
      { error: 'Failed to reset password.' },
      { status: 500 }
    );
  }
}
