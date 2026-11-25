import Link from 'next/link';
import { notFound } from 'next/navigation';
import { connectDB } from '@/lib/mongodb';
import { Problem } from '@/models/Problem';
import { User } from '@/models/User';
import { getUser } from '@/lib/auth';
import ProblemPracticeCard from '@/components/ProblemPracticeCard';
import type { ProblemDTO } from '@/types';

export const dynamic = 'force-dynamic';

export default async function ProblemDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  await connectDB();

  const problem = await Problem.findOne({ slug: params.slug }).lean();
  if (!problem) {
    notFound();
  }

  const authUser = await getUser();
  let initialSolved = false;
  let initialBookmarked = false;

  if (authUser) {
    const dbUser = await User.findById(authUser.id)
      .select('solvedSlugs bookmarkedSlugs')
      .lean();
    if (dbUser) {
      initialSolved = dbUser.solvedSlugs.includes(problem.slug);
      initialBookmarked = dbUser.bookmarkedSlugs.includes(problem.slug);
    }
  }

  const dto: ProblemDTO = {
    id: problem._id.toString(),
    slug: problem.slug,
    title: problem.title,
    topic: problem.topic,
    difficulty: problem.difficulty,
    source: problem.source,
    type: problem.type,
    statement: problem.statement,
    options: problem.options,
    hint: problem.hint,
    tags: problem.tags,
  };

  return (
    <>
      <div className="bar" style={{ marginBottom: 14 }}>
        <Link href="/problems" className="btn sm">
          ← Back to Problem Bank
        </Link>
        {!authUser && (
          <span className="mu">
            <Link href="/login">Login</Link> to save progress &amp; bookmarks.
          </span>
        )}
      </div>

      <ProblemPracticeCard
        problem={dto}
        initialSolved={initialSolved}
        initialBookmarked={initialBookmarked}
        isLoggedIn={Boolean(authUser)}
      />
    </>
  );
}
