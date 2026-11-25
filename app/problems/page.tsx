import Link from 'next/link';
import { connectDB } from '@/lib/mongodb';
import { Problem } from '@/models/Problem';
import { User } from '@/models/User';
import { getUser } from '@/lib/auth';
import AIProblemGenerator from '@/components/AIProblemGenerator';

export const dynamic = 'force-dynamic';

const TOPICS = [
  'All',
  'Limits & Continuity',
  'Differential Calculus',
  'Integral Calculus',
  'Differential Equations',
  'Multivariable & Vector Calculus',
  'Infinite Series & Sequences',
];

const DIFFICULTIES = ['All', 'Foundation', 'JEE Advanced', 'MIT / Putnam'];

export default async function ProblemsPage({
  searchParams,
}: {
  searchParams: { topic?: string; difficulty?: string; q?: string };
}) {
  const topic = searchParams.topic || 'All';
  const difficulty = searchParams.difficulty || 'All';
  const q = (searchParams.q || '').trim();

  await connectDB();

  const filter: Record<string, unknown> = {};
  if (topic !== 'All') filter.topic = topic;
  if (difficulty !== 'All') filter.difficulty = difficulty;
  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: 'i' } },
      { statement: { $regex: q, $options: 'i' } },
      { tags: { $regex: q, $options: 'i' } },
    ];
  }

  const problems = await Problem.find(filter).sort({ createdAt: -1 }).lean();

  const authUser = await getUser();
  let solvedSet = new Set<string>();
  let bookmarkedSet = new Set<string>();

  if (authUser) {
    const dbUser = await User.findById(authUser.id)
      .select('solvedSlugs bookmarkedSlugs')
      .lean();
    if (dbUser) {
      solvedSet = new Set(dbUser.solvedSlugs || []);
      bookmarkedSet = new Set(dbUser.bookmarkedSlugs || []);
    }
  }

  const buildUrl = (nextTopic: string, nextDiff: string) => {
    const params = new URLSearchParams();
    if (nextTopic !== 'All') params.set('topic', nextTopic);
    if (nextDiff !== 'All') params.set('difficulty', nextDiff);
    if (q) params.set('q', q);
    const qs = params.toString();
    return qs ? `/problems?${qs}` : '/problems';
  };

  return (
    <>
      <section className="hero" style={{ paddingBottom: 10 }}>
        <h1>Calculus Problem Bank</h1>
        <p className="mu">
          {problems.length} problem(s) matching your filters.
        </p>

        <AIProblemGenerator mode="problems" />

        <form className="search" method="GET" action="/problems">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by title, theorem, or tag (e.g. Feynman, Bernoulli, Stokes)…"
          />
          {topic !== 'All' && <input type="hidden" name="topic" value={topic} />}
          {difficulty !== 'All' && (
            <input type="hidden" name="difficulty" value={difficulty} />
          )}
          <button type="submit" className="btn p">
            Search
          </button>
        </form>

        <div className="chips">
          {DIFFICULTIES.map((d) => (
            <Link
              key={d}
              href={buildUrl(topic, d)}
              className={`chip ${d === difficulty ? 'on' : ''}`}
            >
              {d}
            </Link>
          ))}
        </div>

        <div className="chips">
          {TOPICS.map((t) => (
            <Link
              key={t}
              href={buildUrl(t, difficulty)}
              className={`chip ${t === topic ? 'on' : ''}`}
            >
              {t}
            </Link>
          ))}
        </div>
      </section>

      <div className="grid">
        {problems.map((p) => {
          const isSolved = solvedSet.has(p.slug);
          const isBookmarked = bookmarkedSet.has(p.slug);
          const diffClass =
            p.difficulty === 'MIT / Putnam'
              ? 'tag purple'
              : p.difficulty === 'JEE Advanced'
                ? 'tag amber'
                : 'tag green';

          return (
            <article key={p.slug} className="card">
              <div>
                <div className="tag-row">
                  <span className={diffClass}>{p.difficulty}</span>
                  <span className="tag subtle">
                    {p.type === 'numerical' ? 'Numerical' : 'MCQ'}
                  </span>
                  {isSolved && <span className="tag green">Solved ✓</span>}
                  {isBookmarked && <span className="tag">★</span>}
                </div>
                <h3 style={{ marginTop: 10, marginBottom: 4 }}>{p.title}</h3>
                <div className="mu">
                  {p.topic} · {p.source}
                </div>
              </div>
              <Link href={`/problems/${p.slug}`} className="btn p sm">
                Practice Problem →
              </Link>
            </article>
          );
        })}
      </div>

      {problems.length === 0 && (
        <div className="card">
          <p className="mu">
            No problems found in MongoDB for these filters. Use the Open-Source
            AI Generator above to create new problems!
          </p>
        </div>
      )}
    </>
  );
}
