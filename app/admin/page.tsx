import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/mongodb';
import { getUser } from '@/lib/auth';
import { User } from '@/models/User';
import { Problem } from '@/models/Problem';
import { TestSeries } from '@/models/TestSeries';
import { Attempt } from '@/models/Attempt';
import AdminPanel from '@/components/AdminPanel';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await getUser();
  if (!user) {
    redirect('/login?next=/admin');
  }
  if (user.role !== 'super_admin') {
    redirect('/dashboard');
  }

  await connectDB();

  const [users, problems, tests, attemptCount] = await Promise.all([
    User.find().select('-passwordHash').sort({ createdAt: -1 }).lean(),
    Problem.find().select('slug title topic difficulty type').sort({ createdAt: -1 }).lean(),
    TestSeries.find().select('slug title difficulty duration questionSlugs').sort({ createdAt: -1 }).lean(),
    Attempt.countDocuments(),
  ]);

  return (
    <>
      <section className="hero" style={{ paddingBottom: 12 }}>
        <span className="tag purple">Super Admin Control Center</span>
        <h1>Platform Administration</h1>
        <p className="mu">
          Signed in as <strong>{user.email}</strong>. Manage users, roles,
          AI-generated problems, and mock exams in MongoDB.
        </p>
      </section>

      <div className="stats-grid">
        <div className="card">
          <div className="mu">Total Users</div>
          <div className="big">{users.length}</div>
        </div>
        <div className="card">
          <div className="mu">MongoDB Problems</div>
          <div className="big">{problems.length}</div>
        </div>
        <div className="card">
          <div className="mu">Mock Exams</div>
          <div className="big">{tests.length}</div>
        </div>
        <div className="card">
          <div className="mu">Total Attempts</div>
          <div className="big">{attemptCount}</div>
        </div>
      </div>

      <AdminPanel
        currentAdminId={user.id}
        users={users.map((u) => ({
          _id: u._id.toString(),
          name: u.name,
          email: u.email,
          role: u.role,
          provider: u.provider,
          solvedCount: u.solvedSlugs?.length ?? 0,
        }))}
        problems={problems.map((p) => ({
          _id: p._id.toString(),
          slug: p.slug,
          title: p.title,
          topic: p.topic,
          difficulty: p.difficulty,
          type: p.type,
        }))}
        tests={tests.map((t) => ({
          _id: t._id.toString(),
          slug: t.slug,
          title: t.title,
          difficulty: t.difficulty,
          duration: t.duration,
          questionCount: t.questionSlugs.length,
        }))}
      />
    </>
  );
}
