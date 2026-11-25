import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { getUser } from '@/lib/auth';
import { Attempt, type IAttemptReview } from '@/models/Attempt';
import { Problem } from '@/models/Problem';
import { TestSeries } from '@/models/TestSeries';
import { User } from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET() {
  const authUser = await getUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const attempts = await Attempt.find({ userId: authUser.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json(attempts);
}

export async function POST(req: NextRequest) {
  const authUser = await getUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();

    const body = (await req.json()) as {
      testSlug: string;
      testTitle?: string;
      problemSlugs: string[];
      answers: Record<string, number>;
      neg?: boolean;
      seconds?: number;
    };

    const test = await TestSeries.findOne({ slug: body.testSlug }).lean();
    const marksPerQ = test?.marks ?? 4;
    const negPenalty = body.neg ? (test?.negative ?? 1) : 0;
    const testTitle = test?.title ?? body.testTitle ?? 'Custom Calculus Mock';

    const slugs = Array.isArray(body.problemSlugs) ? body.problemSlugs : [];
    const problems = await Problem.find({ slug: { $in: slugs } }).lean();
    const bySlug = new Map(problems.map((p) => [p.slug, p]));

    let correct = 0;
    let wrong = 0;
    let skipped = 0;
    const solvedSlugs: string[] = [];
    const review: IAttemptReview[] = [];

    for (const slug of slugs) {
      const p = bySlug.get(slug);
      if (!p) continue;

      const rawAns = body.answers?.[slug];
      const hasAnswer = typeof rawAns === 'number' && !Number.isNaN(rawAns);

      let isCorrect = false;
      if (!hasAnswer) {
        skipped++;
      } else {
        if (p.type === 'mcq') {
          isCorrect = rawAns === p.correctOption;
        } else if (typeof p.correctValue === 'number') {
          isCorrect = Math.abs(rawAns - p.correctValue) <= (p.tolerance ?? 0.01);
        }

        if (isCorrect) {
          correct++;
          solvedSlugs.push(p.slug);
        } else {
          wrong++;
        }
      }

      review.push({
        problemId: p.slug,
        title: p.title,
        statement: p.statement,
        type: p.type,
        options: p.options,
        correctOption: p.correctOption,
        correctValue: p.correctValue,
        userAnswer: hasAnswer ? rawAns : null,
        isCorrect,
        solution: p.solution,
        source: p.source,
        difficulty: p.difficulty,
      });
    }

    const total = review.length;
    const maxScore = total * marksPerQ;
    const score = Number((correct * marksPerQ - wrong * negPenalty).toFixed(2));
    const seconds = Math.min(Math.max(0, Math.round(Number(body.seconds) || 0)), 86400);

    const attempt = await Attempt.create({
      userId: authUser.id,
      userName: authUser.name,
      testSlug: body.testSlug,
      testTitle,
      score,
      maxScore,
      correct,
      wrong,
      skipped,
      total,
      seconds,
      review,
    });

    if (solvedSlugs.length > 0) {
      await User.updateOne(
        { _id: authUser.id },
        { $addToSet: { solvedSlugs: { $each: solvedSlugs } } }
      );
    }

    return NextResponse.json({
      id: attempt._id.toString(),
      testSlug: attempt.testSlug,
      testTitle: attempt.testTitle,
      score: attempt.score,
      maxScore: attempt.maxScore,
      correct: attempt.correct,
      wrong: attempt.wrong,
      skipped: attempt.skipped,
      total: attempt.total,
      seconds: attempt.seconds,
      createdAt: attempt.createdAt.toISOString(),
      review: attempt.review,
    });
  } catch (err) {
    console.error('Submit attempt error:', err);
    return NextResponse.json({ error: 'Failed to submit attempt' }, { status: 500 });
  }
}
