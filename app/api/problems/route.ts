import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Problem } from '@/models/Problem';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const topic = searchParams.get('topic');
    const difficulty = searchParams.get('difficulty');
    const type = searchParams.get('type');
    const q = searchParams.get('q')?.trim();

    const filter: Record<string, unknown> = {};
    if (topic && topic !== 'All') filter.topic = topic;
    if (difficulty && difficulty !== 'All') filter.difficulty = difficulty;
    if (type && type !== 'All') filter.type = type;
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { statement: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } },
      ];
    }

    const problems = await Problem.find(filter)
      .select('-correctOption -correctValue -solution')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      problems.map((p) => ({
        id: p._id.toString(),
        slug: p.slug,
        title: p.title,
        topic: p.topic,
        difficulty: p.difficulty,
        source: p.source,
        type: p.type,
        statement: p.statement,
        options: p.options,
        hint: p.hint,
        tags: p.tags,
      }))
    );
  } catch (err) {
    console.error('Problems API error:', err);
    return NextResponse.json({ error: 'Failed to load problems from MongoDB' }, { status: 500 });
  }
}
