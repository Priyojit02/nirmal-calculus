'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import MathTex from '@/components/MathTex';
import type { AttemptResultDTO, ProblemDTO, TestSeriesDTO } from '@/types';

interface TestRunnerProps {
  test: TestSeriesDTO;
  questions: ProblemDTO[];
}

function formatTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const mins = String(Math.floor(s / 60)).padStart(2, '0');
  const secs = String(s % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

export default function TestRunner({ test, questions }: TestRunnerProps) {
  const maxQ = questions.length;
  const [phase, setPhase] = useState<'setup' | 'run' | 'busy' | 'done'>('setup');
  const [numQ, setNumQ] = useState<number>(maxQ);
  const [mins, setMins] = useState<number>(test.duration);
  const [negMarking, setNegMarking] = useState<boolean>(true);

  const [activeQs, setActiveQs] = useState<ProblemDTO[]>([]);
  const [idx, setIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [result, setResult] = useState<AttemptResultDTO | null>(null);
  const [error, setError] = useState<string>('');

  const startTimeRef = useRef<number>(0);
  const submittedRef = useRef<boolean>(false);

  const startTest = () => {
    const count = Math.max(1, Math.min(maxQ, Number(numQ) || maxQ));
    const selected = [...questions].slice(0, count);
    setActiveQs(selected);
    setIdx(0);
    setAnswers({});
    setMarked({});
    setSecondsLeft(Math.max(1, Number(mins) || 1) * 60);
    startTimeRef.current = Date.now();
    submittedRef.current = false;
    setError('');
    setPhase('run');
  };

  const submitTest = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setPhase('busy');

    try {
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      const res = await fetch('/api/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testSlug: test.slug,
          testTitle: test.title,
          problemSlugs: activeQs.map((q) => q.slug),
          answers,
          neg: negMarking,
          seconds: elapsed,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to submit test');
        setPhase('run');
        submittedRef.current = false;
        return;
      }

      setResult(data as AttemptResultDTO);
      setPhase('done');
    } catch {
      setError('Network error while submitting attempt.');
      setPhase('run');
      submittedRef.current = false;
    }
  }, [activeQs, answers, negMarking, test.slug, test.title]);

  useEffect(() => {
    if (phase !== 'run') return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === 'run' && secondsLeft <= 0) {
      void submitTest();
    }
  }, [phase, secondsLeft, submitTest]);

  if (phase === 'setup') {
    return (
      <div className="card narrow">
        <div className="tag-row">
          <span className="tag">{test.topic}</span>
          <span className="tag amber">{test.difficulty}</span>
        </div>
        <h2>{test.title}</h2>
        <p className="mu">{test.subtitle}</p>
        <label>
          Number of problems (max {maxQ})
          <input
            type="number"
            min={1}
            max={maxQ}
            value={numQ}
            onChange={(e) => setNumQ(Number(e.target.value))}
          />
        </label>
        <label>
          Time limit (minutes)
          <input
            type="number"
            min={1}
            max={180}
            value={mins}
            onChange={(e) => setMins(Number(e.target.value))}
          />
        </label>
        <label className="row checkbox-row">
          <input
            type="checkbox"
            checked={negMarking}
            onChange={(e) => setNegMarking(e.target.checked)}
          />
          <span>
            Enable negative marking (+{test.marks} / −{test.negative} per wrong)
          </span>
        </label>
        <button type="button" className="btn p" onClick={startTest}>
          Begin Timed Exam
        </button>
      </div>
    );
  }

  if (phase === 'busy') {
    return (
      <div className="card narrow">
        <p className="mu">Grading solutions and saving attempt to MongoDB…</p>
      </div>
    );
  }

  if (phase === 'done' && result) {
    const pct = result.maxScore
      ? Math.max(0, Math.round((100 * result.score) / result.maxScore))
      : 0;

    return (
      <div>
        <div className="card">
          <div className="bar">
            <div>
              <div className="mu">
                {secondsLeft <= 0 ? 'Time expired · ' : ''}Exam Completed
              </div>
              <h2>{result.testTitle}</h2>
            </div>
            <Link href="/dashboard" className="btn p">
              View Dashboard →
            </Link>
          </div>
          <div className="big">
            {result.score} / {result.maxScore} ({pct}%)
          </div>
          <p className="mu">
            Correct: {result.correct} · Wrong: {result.wrong} · Skipped:{' '}
            {result.skipped} · Time: {formatTime(result.seconds)}
          </p>
        </div>

        <h3>Detailed Solutions & Review</h3>
        {result.review.map((r, k) => {
          const cardCls =
            r.userAnswer === null
              ? 'card rv'
              : r.isCorrect
                ? 'card rv g'
                : 'card rv r';

          return (
            <div key={r.problemId} className={cardCls}>
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
      </div>
    );
  }

  const q = activeQs[idx];
  if (!q) return null;

  return (
    <div className="card">
      <div className="bar">
        <div>
          <span className="mu">
            Question {idx + 1} / {activeQs.length}
          </span>{' '}
          <span className="tag">{q.topic}</span>
          <span className="tag amber">{q.difficulty}</span>
        </div>
        <span className={`timer ${secondsLeft < 60 ? 'red' : ''}`}>
          ⏱ {formatTime(secondsLeft)}
        </span>
      </div>

      <h3 className="problem-title">{q.title}</h3>
      <div className="statement-box">
        <MathTex text={q.statement} />
      </div>

      {q.type === 'mcq' ? (
        <div className="options-list">
          {q.options.map((opt, j) => (
            <label
              key={j}
              className={`opt ${answers[q.slug] === j ? 'sel' : ''}`}
            >
              <input
                type="radio"
                name={`q-${q.slug}`}
                checked={answers[q.slug] === j}
                onChange={() => setAnswers({ ...answers, [q.slug]: j })}
              />
              <span className="opt-letter">{String.fromCharCode(65 + j)}.</span>
              <MathTex text={opt} />
            </label>
          ))}
        </div>
      ) : (
        <div className="numerical-box">
          <label>
            Numerical Value
            <input
              type="number"
              step="any"
              placeholder="Enter exact integer or decimal"
              value={answers[q.slug] ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  const copy = { ...answers };
                  delete copy[q.slug];
                  setAnswers(copy);
                } else {
                  setAnswers({ ...answers, [q.slug]: Number(val) });
                }
              }}
            />
          </label>
        </div>
      )}

      {error && <p className="err">{error}</p>}

      <div className="row">
        <button
          type="button"
          className="btn"
          disabled={idx === 0}
          onClick={() => setIdx(idx - 1)}
        >
          ← Prev
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            const copy = { ...answers };
            delete copy[q.slug];
            setAnswers(copy);
          }}
        >
          Clear
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setMarked({ ...marked, [q.slug]: !marked[q.slug] })}
        >
          {marked[q.slug] ? 'Unmark' : 'Mark for Review'}
        </button>
        <button
          type="button"
          className="btn"
          disabled={idx === activeQs.length - 1}
          onClick={() => setIdx(idx + 1)}
        >
          Next →
        </button>
        <button
          type="button"
          className="btn p"
          onClick={() => {
            if (window.confirm('Submit your exam now?')) {
              void submitTest();
            }
          }}
        >
          Submit Exam
        </button>
      </div>

      <div className="pal">
        {activeQs.map((item, k) => {
          const isAns = answers[item.slug] !== undefined;
          const isMarked = Boolean(marked[item.slug]);
          const isCurr = k === idx;
          return (
            <button
              type="button"
              key={item.slug}
              onClick={() => setIdx(k)}
              className={`${isAns ? 'a ' : ''}${isMarked ? 'm ' : ''}${isCurr ? 'c' : ''}`}
            >
              {k + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
