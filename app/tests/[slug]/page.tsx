import { redirect, notFound } from 'next/navigation';
import { connectDB } from '@/lib/mongodb';
import { getUser } from '@/lib/auth';
import { TestSeries } from '@/models/TestSeries';
import { Problem } from '@/models/Problem';
import TestRunner from '@/components/TestRunner';
import type { ProblemDTO, TestSeriesDTO } from '@/types';

export const dynamic = 'force-dynamic';

export default async function TestRunnerPage({
  params,
}: {
  params: { slug: string };
}) {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  await connectDB();

  const test = await TestSeries.findOne({ slug: params.slug }).lean();
  if (!test) {
    notFound();
  }

  const problems = await Problem.find({ slug: { $in: test.questionSlugs } })
    .select('-correctOption -correctValue -solution')
    .lean();

  const bySlug = new Map(problems.map((p) => [p.slug, p]));
  const orderedQuestions: ProblemDTO[] = test.questionSlugs
    .map((slug) => bySlug.get(slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({
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
    }));

  const testDto: TestSeriesDTO = {
    id: test._id.toString(),
    slug: test.slug,
    title: test.title,
    subtitle: test.subtitle,
    topic: test.topic,
    difficulty: test.difficulty,
    duration: test.duration,
    marks: test.marks,
    negative: test.negative,
    questionSlugs: test.questionSlugs,
    questionCount: orderedQuestions.length,
  };

  return <TestRunner test={testDto} questions={orderedQuestions} />;
}
