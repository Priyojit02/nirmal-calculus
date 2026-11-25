import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Problem } from '@/models/Problem';
import { User } from '@/models/User';
import { getActiveUser } from '@/lib/session';
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const limited = await checkRateLimit(req, {
    bucket: 'problem-check',
    limit: 40,
    windowSeconds: 60,
  });
  if (limited) return limited;

  try {
    await connectDB();
    const problem = await Problem.findOne({ slug: params.slug }).lean();
    if (!problem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    const body = (await req.json()) as { answer?: number };
    const answer = body.answer;

    if (typeof answer !== 'number' || Number.isNaN(answer)) {
      return NextResponse.json({ error: 'Please provide a valid answer.' }, { status: 400 });
    }

    let isCorrect = false;
    if (problem.type === 'mcq') {
      isCorrect = answer === problem.correctOption;
    } else if (typeof problem.correctValue === 'number') {
      const tol = problem.tolerance ?? 0.01;
      isCorrect = Math.abs(answer - problem.correctValue) <= tol;
    }

    const authUser = await getActiveUser(req);
    if (authUser && isCorrect) {
      await User.updateOne(
        { _id: authUser.id },
        { $addToSet: { solvedSlugs: problem.slug } }
      );
    }

    return NextResponse.json({
      isCorrect,
      correctOption: problem.correctOption,
      correctValue: problem.correctValue,
      solution: problem.solution,
    });
  } catch (err) {
    console.error('Check problem error:', err);
    return NextResponse.json({ error: 'Failed to evaluate answer' }, { status: 500 });
  }
}
