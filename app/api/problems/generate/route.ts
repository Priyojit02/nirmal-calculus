import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { Problem } from '@/models/Problem';
import { generateCalculusProblems } from '@/lib/aiGenerator';
import type { CalculusTopic, DifficultyLevel, QuestionType } from '@/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      topic?: CalculusTopic;
      difficulty?: DifficultyLevel;
      type?: QuestionType | 'mixed';
      count?: number;
    };

    const topic: CalculusTopic = body.topic || 'Integral Calculus';
    const difficulty: DifficultyLevel = body.difficulty || 'JEE Advanced';
    const type: QuestionType | 'mixed' = body.type || 'mixed';
    const count = Math.max(1, Math.min(10, Number(body.count) || 2));

    await connectDB();

    const generated = await generateCalculusProblems({
      topic,
      difficulty,
      type,
      count,
    });

    const saved = await Problem.insertMany(generated);

    return NextResponse.json({
      count: saved.length,
      problems: saved.map((p) => ({
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
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate problems';
    console.error('AI Problem generation error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
