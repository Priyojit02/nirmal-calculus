import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/models/User';
import { getActiveUser } from '@/lib/session';

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const authUser = await getActiveUser(req);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const user = await User.findById(authUser.id);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const exists = user.bookmarkedSlugs.includes(params.slug);
  if (exists) {
    user.bookmarkedSlugs = user.bookmarkedSlugs.filter((s) => s !== params.slug);
  } else {
    user.bookmarkedSlugs.push(params.slug);
  }
  await user.save();

  return NextResponse.json({ bookmarked: !exists });
}
