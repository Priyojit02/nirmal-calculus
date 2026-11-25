import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Problem } from '@/models/Problem';
import { TestSeries } from '@/models/TestSeries';
import { generateCalculusProblems } from '@/lib/aiGenerator';
import { checkRateLimit } from '@/lib/rateLimit';
import type { CalculusTopic, DifficultyLevel } from '@/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, {
    bucket: 'ai-generate',
    limit: 8,
    windowSeconds: 300,
  });
  if (limited) return limited;

  try {
    const body = (await req.json()) as {
      title?: string;
      topic?: CalculusTopic;
      difficulty?: DifficultyLevel;
      count?: number;
      duration?: number;
    };

    const topic: CalculusTopic = body.topic || 'Integral Calculus';
    const difficulty: DifficultyLevel = body.difficulty || 'JEE Advanced';
    const count = Math.max(2, Math.min(10, Number(body.count) || 3));
    const duration = Math.max(1, Math.min(180, Number(body.duration) || count * 5));

    await connectDB();

    const generated = await generateCalculusProblems({
      topic,
      difficulty,
      type: 'mixed',
      count,
    });

    const savedProblems = await Problem.insertMany(generated);
    const questionSlugs = savedProblems.map((p) => p.slug);

    const suffix = Math.random().toString(36).slice(2, 7);
    const title =
      body.title?.trim() || `${difficulty} · ${topic} AI Mock (${count}Q)`;
    const slug = `${difficulty.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${suffix}`;

    const test = await TestSeries.create({
      slug,
      title,
      subtitle: `AI-generated ${difficulty} paper covering ${topic}.`,
      topic,
      difficulty,
      duration,
      marks: difficulty === 'MIT / Putnam' ? 5 : 4,
      negative: 1,
      questionSlugs,
    });

    return NextResponse.json({
      id: test._id.toString(),
      slug: test.slug,
      title: test.title,
      questionCount: questionSlugs.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate mock exam';
    console.error('AI Test generation error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
