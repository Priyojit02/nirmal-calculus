import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomInt } from 'crypto';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { checkRateLimit } from '@/lib/rateLimit';
import { sendPasswordResetEmail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, {
    bucket: 'forgot-password',
    limit: 5,
    windowSeconds: 300,
  });
  if (limited) return limited;

  try {
    const body = (await req.json()) as { email?: string };
    const email = String(body.email ?? '').toLowerCase().trim();

    if (!email.includes('@')) {
      return NextResponse.json(
        { error: 'Enter a valid email address.' },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findOne({ email });

    if (user) {
      const code = String(randomInt(100000, 999999));
      const codeHash = createHash('sha256').update(code).digest('hex');

      user.resetCodeHash = codeHash;
      user.resetCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await user.save();

      await sendPasswordResetEmail(email, code);
    }

    return NextResponse.json({
      ok: true,
      message:
        'If an account exists for that email, a 6-digit verification code has been sent (valid for 15 minutes).',
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return NextResponse.json(
      { error: 'Unable to send reset code right now. Please try again later.' },
      { status: 500 }
    );
  }
}
