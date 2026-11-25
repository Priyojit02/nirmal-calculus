import { redirect } from 'next/navigation';
import Link from 'next/link';
import { connectDB } from '@/lib/mongodb';
import { getUser } from '@/lib/auth';
import { User } from '@/models/User';
import { Problem } from '@/models/Problem';
import { Attempt } from '@/models/Attempt';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const authUser = await getUser();
  if (!authUser) {
    redirect('/login');
  }

  await connectDB();

  const [dbUser, allProblems, myAttempts, leaderboardRaw] = await Promise.all([
    User.findById(authUser.id).lean(),
    Problem.find().select('slug title topic difficulty').lean(),
    Attempt.find({ userId: authUser.id }).sort({ createdAt: -1 }).limit(15).lean(),
    Attempt.aggregate<{ _id: string; name: string; bestPct: number; attempts: number }>([
      {
        $project: {
          userId: 1,
          userName: 1,
          pct: {
            $cond: [
              { $gt: ['$maxScore', 0] },
              { $multiply: [{ $divide: ['$score', '$maxScore'] }, 100] },
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: '$userId',
          name: { $first: '$userName' },
          bestPct: { $max: '$pct' },
          attempts: { $sum: 1 },
        },
      },
      { $sort: { bestPct: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const solvedSet = new Set(dbUser?.solvedSlugs || []);
  const bookmarkedSlugs = dbUser?.bookmarkedSlugs || [];
  const bookmarkedProblems = allProblems.filter((p) =>
    bookmarkedSlugs.includes(p.slug)
  );

  const pct = (score: number, maxScore: number) =>
    maxScore > 0 ? Math.max(0, Math.round((100 * score) / maxScore)) : 0;

  const avgPct = myAttempts.length
    ? Math.round(
        myAttempts.reduce((acc, a) => acc + pct(a.score, a.maxScore), 0) /
          myAttempts.length
      )
    : 0;

  const bestPct = myAttempts.length
    ? Math.max(...myAttempts.map((a) => pct(a.score, a.maxScore)))
    : 0;

  const topicStats = new Map<string, { total: number; solved: number }>();
  for (const p of allProblems) {
    const curr = topicStats.get(p.topic) || { total: 0, solved: 0 };
    curr.total += 1;
    if (solvedSet.has(p.slug)) curr.solved += 1;
    topicStats.set(p.topic, curr);
  }

  return (
    <>
      <h1>Calculus Mastery Dashboard</h1>

      <div className="stats-grid">
        <div className="card">
          <div className="mu">Problems Solved</div>
          <div className="big">
            {solvedSet.size} / {allProblems.length}
          </div>
        </div>
        <div className="card">
          <div className="mu">Mock Tests Taken</div>
          <div className="big">{myAttempts.length}</div>
        </div>
        <div className="card">
          <div className="mu">Average Mock Score</div>
          <div className="big">{avgPct}%</div>
        </div>
        <div className="card">
          <div className="mu">Best Mock Score</div>
          <div className="big">{bestPct}%</div>
        </div>
      </div>

      <div className="card">
        <h3>Topic Mastery</h3>
        {topicStats.size === 0 ? (
          <p className="mu">
            No problems in MongoDB yet.{' '}
            <Link href="/problems">Generate calculus problems with AI</Link>.
          </p>
        ) : (
          Array.from(topicStats.entries()).map(([topic, stat]) => {
            const p = stat.total ? Math.round((100 * stat.solved) / stat.total) : 0;
            return (
              <div key={topic} className="barrow">
                <span>{topic}</span>
                <div className="track">
                  <div style={{ width: `${p}%` }} />
                </div>
                <strong>
                  {stat.solved}/{stat.total}
                </strong>
              </div>
            );
          })
        )}
      </div>

      <div className="card">
        <h3>Recent Mock Attempts</h3>
        {myAttempts.length === 0 ? (
          <p className="mu">
            No mock attempts yet.{' '}
            <Link href="/tests">Take or generate your first timed mock exam</Link>.
          </p>
        ) : (
          myAttempts.slice(0, 10).map((a) => {
            const p = pct(a.score, a.maxScore);
            return (
              <div key={a._id.toString()} className="barrow">
                <Link href={`/dashboard/attempts/${a._id.toString()}`}>
                  {a.testTitle}
                </Link>
                <div className="track">
                  <div style={{ width: `${p}%` }} />
                </div>
                <strong>{p}%</strong>
              </div>
            );
          })
        )}
      </div>

      {bookmarkedProblems.length > 0 && (
        <div className="card">
          <h3>Bookmarked Problems</h3>
          <div className="row">
            {bookmarkedProblems.map((p) => (
              <Link key={p.slug} href={`/problems/${p.slug}`} className="btn sm">
                ★ {p.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h3>Global Leaderboard (Best Mock %)</h3>
        {leaderboardRaw.length === 0 ? (
          <p className="mu">Be the first to set a score on the leaderboard!</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Scholar</th>
                <th>Attempts</th>
                <th>Best Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardRaw.map((entry, idx) => (
                <tr key={String(entry._id)}>
                  <td>#{idx + 1}</td>
                  <td>{entry.name}</td>
                  <td>{entry.attempts}</td>
                  <td>{Math.max(0, Math.round(entry.bestPct))}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
