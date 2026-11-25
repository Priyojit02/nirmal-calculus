import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { TestSeries } from '@/models/TestSeries';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const tests = await TestSeries.find().sort({ createdAt: -1 }).lean();

    return NextResponse.json(
      tests.map((t) => ({
        id: t._id.toString(),
        slug: t.slug,
        title: t.title,
        subtitle: t.subtitle,
        topic: t.topic,
        difficulty: t.difficulty,
        duration: t.duration,
        marks: t.marks,
        negative: t.negative,
        questionSlugs: t.questionSlugs,
        questionCount: t.questionSlugs.length,
      }))
    );
  } catch (err) {
    console.error('Tests API error:', err);
    return NextResponse.json({ error: 'Failed to load tests from MongoDB' }, { status: 500 });
  }
}
