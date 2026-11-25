'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { CalculusTopic, DifficultyLevel, QuestionType } from '@/types';

const TOPICS: CalculusTopic[] = [
  'Limits & Continuity',
  'Differential Calculus',
  'Integral Calculus',
  'Differential Equations',
  'Multivariable & Vector Calculus',
  'Infinite Series & Sequences',
];

const DIFFICULTIES: DifficultyLevel[] = [
  'Foundation',
  'JEE Advanced',
  'MIT / Putnam',
];

interface AIProblemGeneratorProps {
  mode: 'problems' | 'test';
}

export default function AIProblemGenerator({ mode }: AIProblemGeneratorProps) {
  const router = useRouter();
  const [topic, setTopic] = useState<CalculusTopic | 'All'>(
    mode === 'test' ? 'All' : 'Integral Calculus'
  );
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('JEE Advanced');
  const [type, setType] = useState<QuestionType | 'mixed'>('mixed');
  const [count, setCount] = useState<number>(mode === 'test' ? 25 : 2);
  const [duration, setDuration] = useState<number>(80);
  const [reuseBank, setReuseBank] = useState<boolean>(true);
  const [customTitle, setCustomTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const safeJson = async (res: Response) => {
    const raw = await res.text();
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {
        error: res.ok
          ? 'Invalid server response.'
          : `Server returned ${res.status} (try smaller batch size).`,
      };
    }
  };

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('');
    setProgress('');
    setLoading(true);

    try {
      if (mode === 'problems') {
        const chosenTopic: CalculusTopic =
          topic === 'All' ? 'Integral Calculus' : topic;
        const res = await fetch('/api/problems/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: chosenTopic,
            difficulty,
            type,
            count: Math.max(1, Math.min(10, count)),
          }),
        });
        const data = await safeJson(res);
        if (!res.ok) {
          setError(String(data.error || 'Generation failed.'));
          return;
        }
        setStatus(`Generated ${String(data.count ?? count)} new problem(s).`);
        router.refresh();
        return;
      }

      // Mock Exam Mode (supports 2 to 25 questions via bank reuse + safe batches of 3)
      const targetCount = Math.max(2, Math.min(25, Number(count) || 25));
      const collectedSlugs: string[] = [];

      if (reuseBank) {
        setProgress('Checking existing Problem Bank…');
        const params = new URLSearchParams();
        if (topic !== 'All') params.set('topic', topic);
        params.set('difficulty', difficulty);
        const bankRes = await fetch(`/api/problems?${params.toString()}`);
        if (bankRes.ok) {
          const bankList = (await bankRes.json()) as Array<{ slug: string }>;
          const shuffled = [...bankList].sort(() => Math.random() - 0.5);
          for (const item of shuffled.slice(0, targetCount)) {
            collectedSlugs.push(item.slug);
          }
        }
      }

      let topicIdx = 0;
      while (collectedSlugs.length < targetCount) {
        const remaining = targetCount - collectedSlugs.length;
        const batchSize = Math.min(3, remaining);
        const batchTopic: CalculusTopic =
          topic === 'All' ? TOPICS[topicIdx % TOPICS.length] : topic;
        topicIdx++;

        setProgress(
          `Generating questions (${collectedSlugs.length} / ${targetCount} ready)…`
        );

        const genRes = await fetch('/api/problems/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: batchTopic,
            difficulty,
            type: 'mixed',
            count: batchSize,
          }),
        });
        const genData = await safeJson(genRes);
        if (!genRes.ok) {
          if (collectedSlugs.length >= 2) {
            setError(
              `${String(genData.error || 'AI busy')} — creating mock with ${collectedSlugs.length} ready problems instead.`
            );
            break;
          }
          setError(String(genData.error || 'Could not generate problems.'));
          return;
        }

        const newProblems = Array.isArray(genData.problems)
          ? (genData.problems as Array<{ slug: string }>)
          : [];
        for (const p of newProblems) {
          if (collectedSlugs.length < targetCount) {
            collectedSlugs.push(p.slug);
          }
        }
      }

      setProgress('Saving timed mock exam…');
      const createRes = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: customTitle,
          topic: topic === 'All' ? 'Full Calculus Syllabus' : topic,
          difficulty,
          duration,
          questionSlugs: collectedSlugs,
        }),
      });
      const created = await safeJson(createRes);
      if (!createRes.ok) {
        setError(String(created.error || 'Failed to save mock exam.'));
        return;
      }

      setProgress('');
      setStatus(`Created "${String(created.title)}". Launching exam…`);
      router.push(`/tests/${String(created.slug)}`);
      router.refresh();
    } catch {
      setError('Network error while contacting generator.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="card" onSubmit={handleGenerate}>
      <div className="bar wrap">
        <div>
          <span className="tag purple">AI Calculus Engine</span>
          <h3 style={{ margin: '8px 0 4px' }}>
            {mode === 'test'
              ? 'Generate Custom Timed Mock Exam'
              : 'Generate Fresh Practice Problems'}
          </h3>
          <p className="mu" style={{ margin: 0 }}>
            Set topic, standard, question count
            {mode === 'test' ? ', and time limit (e.g. 25Q · 80 min)' : ''} to
            create fresh problems.
          </p>
        </div>
      </div>

      <div
        className="grid"
        style={{
          gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
          marginTop: 14,
          marginBottom: 10,
        }}
      >
        <label>
          Calculus Topic
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value as CalculusTopic | 'All')}
          >
            {mode === 'test' && (
              <option value="All">All Calculus Topics (Full Syllabus)</option>
            )}
            {TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label>
          Standard / Difficulty
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>

        {mode === 'problems' ? (
          <label>
            Question Format
            <select
              value={type}
              onChange={(e) => setType(e.target.value as QuestionType | 'mixed')}
            >
              <option value="mixed">Mixed (MCQ + Numerical)</option>
              <option value="mcq">MCQ Only</option>
              <option value="numerical">Numerical Value Only</option>
            </select>
          </label>
        ) : (
          <label>
            Exam Title (optional)
            <input
              placeholder="e.g. JEE Adv 25Q Full Mock"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
            />
          </label>
        )}

        <label>
          Number of Questions ({mode === 'test' ? '2–25' : '1–10'})
          <input
            type="number"
            min={mode === 'test' ? 2 : 1}
            max={mode === 'test' ? 25 : 10}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </label>

        {mode === 'test' && (
          <label>
            Time Limit (minutes)
            <input
              type="number"
              min={1}
              max={180}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </label>
        )}
      </div>

      {mode === 'test' && (
        <label className="row checkbox-row" style={{ marginBottom: 10 }}>
          <input
            type="checkbox"
            checked={reuseBank}
            onChange={(e) => setReuseBank(e.target.checked)}
          />
          <span>
            Include existing Problem Bank questions first (much faster for 25Q
            mocks)
          </span>
        </label>
      )}

      {progress && <p className="mu">{progress}</p>}
      {error && <p className="err">{error}</p>}
      {status && <p className="ok">{status}</p>}

      <button type="submit" className="btn p" disabled={loading}>
        {loading
          ? progress || 'Crafting rigorous calculus problems…'
          : mode === 'test'
            ? 'Generate & Launch Timed Mock →'
            : 'Generate Problems'}
      </button>
    </form>
  );
}
