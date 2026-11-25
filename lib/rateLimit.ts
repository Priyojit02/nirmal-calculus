import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { RateLimit } from '@/models/RateLimit';

export interface RateLimitOptions {
  bucket: string;
  limit: number;
  windowSeconds: number;
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || 'unknown';
}

export async function checkRateLimit(
  req: NextRequest,
  options: RateLimitOptions
): Promise<NextResponse | null> {
  try {
    await connectDB();
    const ip = getClientIp(req);
    const key = `${options.bucket}:${ip}`;
    const now = new Date();
    const nextExpiry = new Date(now.getTime() + options.windowSeconds * 1000);

    // Reset expired bucket atomically if needed, otherwise increment
    await RateLimit.deleteOne({ key, expiresAt: { $lte: now } });

    const doc = await RateLimit.findOneAndUpdate(
      { key },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: nextExpiry },
      },
      { upsert: true, new: true }
    ).lean();

    if (doc && doc.count > options.limit) {
      const retryAfter = Math.max(
        1,
        Math.ceil((new Date(doc.expiresAt).getTime() - now.getTime()) / 1000)
      );
      return NextResponse.json(
        {
          error: `Too many requests. Please wait ${retryAfter}s before trying again.`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        }
      );
    }

    return null;
  } catch (err) {
    // Fail open if rate-limit DB check encounters transient error
    console.error('Rate limit check error:', err);
    return null;
  }
}
