import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { connectDB } from '@/lib/mongodb';
import { getUser } from '@/lib/auth';
import { Attempt } from '@/models/Attempt';
import MathTex from '@/components/MathTex';

export const dynamic = 'force-dynamic';

export default async function AttemptDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const authUser = await getUser();
  if (!authUser) {
    redirect('/login');
  }

  await connectDB();
  const attempt = await Attempt.findOne({
    _id: params.id,
    userId: authUser.id,
  }).lean();

  if (!attempt) {
    notFound();
  }

  const pct = attempt.maxScore
    ? Math.max(0, Math.round((100 * attempt.score) / attempt.maxScore))
    : 0;

  return (
    <>
      <div className="bar" style={{ marginBottom: 14 }}>
        <Link href="/dashboard" className="btn sm">
          ← Back to Dashboard
        </Link>
        <span className="mu">
          Submitted {new Date(attempt.createdAt).toLocaleString()}
        </span>
      </div>

      <div className="card">
        <h2>{attempt.testTitle}</h2>
        <div className="big">
          {attempt.score} / {attempt.maxScore} ({pct}%)
        </div>
        <p className="mu">
          Correct: {attempt.correct} · Wrong: {attempt.wrong} · Skipped:{' '}
          {attempt.skipped} · Duration: {Math.floor(attempt.seconds / 60)}m{' '}
          {attempt.seconds % 60}s
        </p>
      </div>

      <h3>Question-by-Question Review</h3>
      {attempt.review.map((r, k) => {
        const cardCls =
          r.userAnswer === null
            ? 'card rv'
            : r.isCorrect
              ? 'card rv g'
              : 'card rv r';

        return (
          <div key={`${r.problemId}-${k}`} className={cardCls}>
            <div className="bar">
              <strong>
                Q{k + 1}. {r.title}
              </strong>
              <span className="tag">{r.difficulty}</span>
            </div>
            <div className="statement-box">
              <MathTex text={r.statement} />
            </div>

            {r.type === 'mcq' ? (
              <ul className="review-opts">
                {r.options.map((opt, j) => {
                  const isAns = j === r.correctOption;
                  const isUser = j === r.userAnswer;
                  const cls = isAns ? 'ok' : isUser ? 'bad' : '';
                  return (
                    <li key={j} className={cls}>
                      <span>{String.fromCharCode(65 + j)}. </span>
                      <MathTex text={opt} />
                      {isAns && ' ✓'}
                      {isUser && !isAns && ' ✗ (your choice)'}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>
                Your answer:{' '}
                <strong>{r.userAnswer === null ? 'Skipped' : r.userAnswer}</strong>{' '}
                · Correct value: <strong className="ok">{r.correctValue}</strong>
              </p>
            )}

            <div className="callout hint-box">
              <strong>Solution:</strong>
              <MathTex text={r.solution} />
            </div>
          </div>
        );
      })}
    </>
  );
}
