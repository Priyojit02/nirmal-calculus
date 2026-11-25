import Link from 'next/link';
import { connectDB } from '@/lib/mongodb';
import { TestSeries } from '@/models/TestSeries';
import AIProblemGenerator from '@/components/AIProblemGenerator';

export const dynamic = 'force-dynamic';

export default async function TestsPage() {
  await connectDB();
  const tests = await TestSeries.find().sort({ createdAt: -1 }).lean();

  return (
    <>
      <section className="hero" style={{ paddingBottom: 10 }}>
        <h1>Timed Mock Exams</h1>
        <p className="mu">
          Generate custom JEE Advanced &amp; MIT-level mock exams using
          open-source AI, saved directly in MongoDB.
        </p>
      </section>

      <AIProblemGenerator mode="test" />

      <div className="grid">
        {tests.map((t) => {
          const diffClass =
            t.difficulty === 'MIT / Putnam'
              ? 'tag purple'
              : t.difficulty === 'JEE Advanced'
                ? 'tag amber'
                : 'tag green';

          return (
            <article key={t.slug} className="card">
              <div>
                <div className="tag-row">
                  <span className="tag">{t.topic}</span>
                  <span className={diffClass}>{t.difficulty}</span>
                </div>
                <h3 style={{ marginTop: 10, marginBottom: 6 }}>{t.title}</h3>
                <p className="mu">{t.subtitle}</p>
                <div className="mu">
                  {t.questionSlugs.length} problems · {t.duration} min · +
                  {t.marks} / −{t.negative} marking
                </div>
              </div>
              <Link className="btn p" href={`/tests/${t.slug}`}>
                Start Mock Exam →
              </Link>
            </article>
          );
        })}
      </div>

      {tests.length === 0 && (
        <div className="card">
          <p className="mu">
            No mock exams in MongoDB yet. Use the generator above to create your
            first AI mock paper!
          </p>
        </div>
      )}
    </>
  );
}
