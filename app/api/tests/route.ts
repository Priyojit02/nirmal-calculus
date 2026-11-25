import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { TestSeries } from '@/models/TestSeries';
import { checkRateLimit } from '@/lib/rateLimit';

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
    return NextResponse.json({ error: 'Failed to load tests' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, {
    bucket: 'tests-create',
    limit: 20,
    windowSeconds: 300,
  });
  if (limited) return limited;

  try {
    const body = (await req.json()) as {
      title?: string;
      topic?: string;
      difficulty?: 'Foundation' | 'JEE Advanced' | 'MIT / Putnam' | 'Mixed';
      duration?: number;
      questionSlugs?: string[];
    };

    const slugs = Array.isArray(body.questionSlugs)
      ? body.questionSlugs.filter((s) => typeof s === 'string' && s.trim())
      : [];

    if (slugs.length < 1 || slugs.length > 50) {
      return NextResponse.json(
        { error: 'Provide between 1 and 50 question slugs.' },
        { status: 400 }
      );
    }

    const topic = body.topic?.trim() || 'Full Calculus Syllabus';
    const difficulty = body.difficulty || 'JEE Advanced';
    const duration = Math.max(1, Math.min(180, Number(body.duration) || 80));
    const suffix = Math.random().toString(36).slice(2, 7);
    const title =
      body.title?.trim() || `${difficulty} · ${topic} Mock (${slugs.length}Q)`;
    const slug = `${difficulty.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${suffix}`;

    await connectDB();

    const test = await TestSeries.create({
      slug,
      title,
      subtitle: `${slugs.length}-question timed exam (${duration} min) covering ${topic}.`,
      topic,
      difficulty,
      duration,
      marks: difficulty === 'MIT / Putnam' ? 5 : 4,
      negative: 1,
      questionSlugs: slugs,
    });

    return NextResponse.json({
      id: test._id.toString(),
      slug: test.slug,
      title: test.title,
      questionCount: slugs.length,
    });
  } catch (err) {
    console.error('Create test error:', err);
    return NextResponse.json(
      { error: 'Failed to create mock exam' },
      { status: 500 }
    );
  }
}
