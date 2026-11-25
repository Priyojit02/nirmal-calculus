import Link from 'next/link';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { Problem } from '@/models/Problem';
import { TestSeries } from '@/models/TestSeries';
import { checkAIHealth } from '@/lib/aiGenerator';
import MathTex from '@/components/MathTex';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let problemCount = 0;
  let testCount = 0;
  let featured: {
    slug: string;
    title: string;
    topic: string;
    difficulty: string;
    source: string;
    statement: string;
  } | null = null;
  let dbConnected = false;
  let dbError = '';

  try {
    await connectDB();
    dbConnected = mongoose.connection.readyState === 1;
    problemCount = await Problem.countDocuments();
    testCount = await TestSeries.countDocuments();
    const doc = await Problem.findOne().sort({ createdAt: -1 }).lean();
    if (doc) {
      featured = {
        slug: doc.slug,
        title: doc.title,
        topic: doc.topic,
        difficulty: doc.difficulty,
        source: doc.source,
        statement: doc.statement,
      };
    }
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'Unable to connect to MongoDB.';
  }

  const aiHealth = await checkAIHealth();

  return (
    <>
      <section className="hero">
        <div className="tag-row" style={{ marginBottom: 10 }}>
          <span className="tag purple">MIT 18.01 / 18.02</span>
          <span className="tag amber">JEE Advanced</span>
          <span className={dbConnected ? 'tag green' : 'tag amber'}>
            MongoDB: {dbConnected ? 'Connected' : 'Disconnected'}
          </span>
          <span className={aiHealth.reachable ? 'tag green' : 'tag subtle'}>
            AI Engine: {aiHealth.reachable ? 'Online' : 'Standby'}
          </span>
        </div>
        <h1>AI-Powered Calculus Practice, Backed by MongoDB.</h1>
        <p className="mu">
          Generate original JEE Advanced &amp; MIT-level calculus problems on
          demand using any open-source LLM (Ollama, Qwen2.5-Math, Llama, Hugging
          Face) and persist everything in MongoDB with full KaTeX solutions.
        </p>
        <div className="row">
          <Link href="/problems" className="btn p">
            Open Problem Bank &amp; AI Generator →
          </Link>
          <Link href="/tests" className="btn">
            Generate or Take a Timed Mock
          </Link>
        </div>
      </section>

      {!dbConnected && (
        <div className="callout err-box">
          <strong>MongoDB Connection Error:</strong> {dbError || 'Check MONGODB_URI in .env.local and ensure MongoDB is running.'}
        </div>
      )}

      <div className="stats-grid">
        <div className="card">
          <div className="mu">Problems in MongoDB</div>
          <div className="big">{problemCount}</div>
          <div className="mu">100% AI-generated &amp; persisted</div>
        </div>
        <div className="card">
          <div className="mu">Timed Mock Papers</div>
          <div className="big">{testCount}</div>
          <div className="mu">JEE &amp; MIT Formats</div>
        </div>
        <div className="card">
          <div className="mu">Core Domains</div>
          <div className="big">6</div>
          <div className="mu">Limits to Vector Calculus</div>
        </div>
      </div>

      {featured ? (
        <div className="card">
          <div className="bar wrap">
            <div className="tag-row">
              <span className="tag">Latest in MongoDB</span>
              <span className="tag purple">{featured.difficulty}</span>
              <span className="tag subtle">{featured.source}</span>
            </div>
            <Link href={`/problems/${featured.slug}`} className="btn p sm">
              Solve Now →
            </Link>
          </div>
          <h3 className="problem-title">{featured.title}</h3>
          <div className="statement-box">
            <MathTex text={featured.statement} />
          </div>
        </div>
      ) : (
        <div className="card">
          <h3>No Problems in MongoDB Yet</h3>
          <p className="mu">
            No hardcoded questions are bundled. Head to the Problem Bank to
            generate fresh JEE Advanced &amp; MIT calculus problems using your
            open-source AI model.
          </p>
          <Link href="/problems" className="btn p sm">
            Generate First Problems →
          </Link>
        </div>
      )}

      <h2>Practice by Calculus Domain</h2>
      <div className="grid">
        {[
          {
            topic: 'Limits & Continuity',
            desc: 'Maclaurin cancellation traps, Riemann product limits, and non-differentiability.',
          },
          {
            topic: 'Differential Calculus',
            desc: 'Inverse function theorem, Newton-Leibniz extrema, and optimization.',
          },
          {
            topic: 'Integral Calculus',
            desc: 'King’s property, Feynman parameter differentiation, and Gaussian transforms.',
          },
          {
            topic: 'Differential Equations',
            desc: 'Bernoulli equations, integrating factors, and orthogonal trajectories.',
          },
          {
            topic: 'Multivariable & Vector Calculus',
            desc: 'Polar Jacobians, Lagrange multipliers, Green’s & Stokes’ theorems.',
          },
          {
            topic: 'Infinite Series & Sequences',
            desc: 'Telescoping sums, arctan identities, and Stirling radius of convergence.',
          },
        ].map((item) => (
          <article key={item.topic} className="card">
            <div>
              <h3>{item.topic}</h3>
              <p className="mu">{item.desc}</p>
            </div>
            <Link
              href={`/problems?topic=${encodeURIComponent(item.topic)}`}
              className="btn sm"
            >
              Browse {item.topic} →
            </Link>
          </article>
        ))}
      </div>
    </>
  );
}
