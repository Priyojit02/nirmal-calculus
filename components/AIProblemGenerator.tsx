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
  const [topic, setTopic] = useState<CalculusTopic>('Integral Calculus');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('JEE Advanced');
  const [type, setType] = useState<QuestionType | 'mixed'>('mixed');
  const [count, setCount] = useState<number>(mode === 'test' ? 4 : 2);
  const [duration, setDuration] = useState<number>(20);
  const [customTitle, setCustomTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('');
    setLoading(true);

    try {
      const endpoint =
        mode === 'test' ? '/api/tests/generate' : '/api/problems/generate';

      const payload =
        mode === 'test'
          ? { title: customTitle, topic, difficulty, count, duration }
          : { topic, difficulty, type, count };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as {
        error?: string;
        count?: number;
        slug?: string;
        title?: string;
      };

      if (!res.ok) {
        setError(data.error || 'Generation failed.');
        return;
      }

      if (mode === 'test' && data.slug) {
        setStatus(`Created "${data.title}" in MongoDB. Launching exam…`);
        router.push(`/tests/${data.slug}`);
        router.refresh();
      } else {
        setStatus(
          `Generated ${data.count ?? count} new problem(s) and saved to MongoDB.`
        );
        router.refresh();
      }
    } catch {
      setError('Network error while contacting AI generator.');
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
              : 'Generate Fresh Practice Problems into MongoDB'}
          </h3>
          <p className="mu" style={{ margin: 0 }}>
            Set topic, standard, question count
            {mode === 'test' ? ', and time limit' : ''} to create fresh
            problems.
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
            onChange={(e) => setTopic(e.target.value as CalculusTopic)}
          >
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
              placeholder="e.g. Feynman Integration Sprint"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
            />
          </label>
        )}

        <label>
          Number of Questions ({mode === 'test' ? '2–10' : '1–10'})
          <input
            type="number"
            min={mode === 'test' ? 2 : 1}
            max={10}
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

      {error && <p className="err">{error}</p>}
      {status && <p className="ok">{status}</p>}

      <button type="submit" className="btn p" disabled={loading}>
        {loading
          ? 'Crafting rigorous calculus problems…'
          : mode === 'test'
            ? 'Generate & Launch Timed Mock →'
            : 'Generate & Save to MongoDB'}
      </button>
    </form>
  );
}
