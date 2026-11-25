import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getUser } from '@/lib/auth';
import { User } from '@/models/User';
import { Problem } from '@/models/Problem';
import { TestSeries } from '@/models/TestSeries';
import { Attempt } from '@/models/Attempt';

export const dynamic = 'force-dynamic';

async function requireSuperAdmin(req: NextRequest) {
  const user = await getUser(req);
  if (!user || user.role !== 'super_admin') {
    return null;
  }
  return user;
}

export async function GET(req: NextRequest) {
  const admin = await requireSuperAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const [users, problems, tests, attempts] = await Promise.all([
    User.find().select('-passwordHash').sort({ createdAt: -1 }).lean(),
    Problem.find().select('slug title topic difficulty type source createdAt').sort({ createdAt: -1 }).lean(),
    TestSeries.find().select('slug title topic difficulty duration questionSlugs createdAt').sort({ createdAt: -1 }).lean(),
    Attempt.find().select('userName testTitle score maxScore createdAt').sort({ createdAt: -1 }).limit(20).lean(),
  ]);

  return NextResponse.json({ users, problems, tests, attempts });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireSuperAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await req.json()) as {
    userId?: string;
    role?: 'user' | 'super_admin';
  };

  if (!body.userId || (body.role !== 'user' && body.role !== 'super_admin')) {
    return NextResponse.json({ error: 'Invalid userId or role' }, { status: 400 });
  }

  await connectDB();
  await User.updateOne({ _id: body.userId }, { $set: { role: body.role } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireSuperAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get('kind');
  const id = searchParams.get('id');

  if (!kind || !id) {
    return NextResponse.json({ error: 'Missing kind or id' }, { status: 400 });
  }

  await connectDB();

  if (kind === 'user') {
    if (id === admin.id) {
      return NextResponse.json({ error: 'Cannot delete your own super_admin account' }, { status: 400 });
    }
    await User.deleteOne({ _id: id });
  } else if (kind === 'problem') {
    await Problem.deleteOne({ _id: id });
  } else if (kind === 'test') {
    await TestSeries.deleteOne({ _id: id });
  } else {
    return NextResponse.json({ error: 'Unknown resource kind' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
