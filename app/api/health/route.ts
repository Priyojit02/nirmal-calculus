import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { checkAIHealth } from '@/lib/aiGenerator';

export const dynamic = 'force-dynamic';

export async function GET() {
  let mongoConnected = false;
  let mongoError: string | null = null;

  try {
    await connectDB();
    mongoConnected = mongoose.connection.readyState === 1;
  } catch (err) {
    mongoError = err instanceof Error ? err.message : 'MongoDB connection failed';
  }

  const ai = await checkAIHealth();

  return NextResponse.json({
    mongo: {
      connected: mongoConnected,
      error: mongoError,
    },
    ai,
  });
}
