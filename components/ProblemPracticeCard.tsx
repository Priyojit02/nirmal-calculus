'use client';

import { useState } from 'react';
import MathTex from '@/components/MathTex';
import type { ProblemDTO } from '@/types';

interface CheckResult {
  isCorrect: boolean;
  correctOption?: number;
  correctValue?: number;
  solution: string;
}

interface ProblemPracticeCardProps {
  problem: ProblemDTO;
  initialSolved?: boolean;
  initialBookmarked?: boolean;
  isLoggedIn: boolean;
}

export default function ProblemPracticeCard({
  problem,
  initialSolved = false,
  initialBookmarked = false,
  isLoggedIn,
}: ProblemPracticeCardProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [numericInput, setNumericInput] = useState<string>('');
  const [showHint, setShowHint] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [solved, setSolved] = useState(initialSolved);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [error, setError] = useState('');

  const handleCheck = async () => {
    setError('');
    let answer: number;

    if (problem.type === 'mcq') {
      if (selectedOption === null) {
        setError('Select an option first.');
        return;
      }
      answer = selectedOption;
    } else {
      const parsed = Number(numericInput.trim());
      if (!numericInput.trim() || Number.isNaN(parsed)) {
        setError('Enter a valid numeric value.');
        return;
      }
      answer = parsed;
    }

    setChecking(true);
    try {
      const res = await fetch(`/api/problems/${problem.slug}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer }),
      });
      const data = (await res.json()) as CheckResult & { error?: string };
      if (!res.ok) {
        setError(data.error || 'Could not check answer.');
      } else {
        setResult(data);
        if (data.isCorrect) setSolved(true);
      }
    } catch {
      setError('Network error while checking answer.');
    } finally {
      setChecking(false);
    }
  };

  const toggleBookmark = async () => {
    if (!isLoggedIn) {
      setError('Log in to bookmark problems.');
      return;
    }
    const res = await fetch(`/api/problems/${problem.slug}/bookmark`, {
      method: 'POST',
    });
    if (res.ok) {
      const data = (await res.json()) as { bookmarked: boolean };
      setBookmarked(data.bookmarked);
    }
  };

  const diffClass =
    problem.difficulty === 'MIT / Putnam'
      ? 'tag purple'
      : problem.difficulty === 'JEE Advanced'
        ? 'tag amber'
        : 'tag green';

  return (
    <div className="card practice-card">
      <div className="bar wrap">
        <div className="tag-row">
          <span className="tag">{problem.topic}</span>
          <span className={diffClass}>{problem.difficulty}</span>
          <span className="tag subtle">{problem.source}</span>
          {solved && <span className="tag green">Solved ✓</span>}
        </div>
        <button
          type="button"
          className={`btn sm ${bookmarked ? 'p' : ''}`}
          onClick={toggleBookmark}
        >
          {bookmarked ? '★ Bookmarked' : '☆ Bookmark'}
        </button>
      </div>

      <h2 className="problem-title">{problem.title}</h2>
      <div className="statement-box">
        <MathTex text={problem.statement} />
      </div>

      {problem.type === 'mcq' ? (
        <div className="options-list">
          {problem.options.map((opt, idx) => {
            let cls = 'opt';
            if (result) {
              if (idx === result.correctOption) cls += ' opt-correct';
              else if (idx === selectedOption && !result.isCorrect) cls += ' opt-wrong';
            } else if (selectedOption === idx) {
              cls += ' sel';
            }

            return (
              <label key={idx} className={cls}>
                <input
                  type="radio"
                  name={`practice-${problem.slug}`}
                  checked={selectedOption === idx}
                  onChange={() => setSelectedOption(idx)}
                  disabled={Boolean(result?.isCorrect)}
                />
                <span className="opt-letter">{String.fromCharCode(65 + idx)}.</span>
                <MathTex text={opt} />
              </label>
            );
          })}
        </div>
      ) : (
        <div className="numerical-box">
          <label>
            Numerical Answer (integer or decimal)
            <input
              type="number"
              step="any"
              placeholder="e.g. 14 or 0.25"
              value={numericInput}
              onChange={(e) => setNumericInput(e.target.value)}
              disabled={Boolean(result?.isCorrect)}
            />
          </label>
        </div>
      )}

      {error && <p className="err">{error}</p>}

      <div className="row">
        <button
          type="button"
          className="btn p"
          onClick={handleCheck}
          disabled={checking}
        >
          {checking ? 'Checking…' : 'Submit Answer'}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setShowHint((v) => !v)}
        >
          {showHint ? 'Hide Hint' : 'Show Hint'}
        </button>
        {result && !result.isCorrect && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              setResult(null);
              setSelectedOption(null);
              setNumericInput('');
            }}
          >
            Try Again
          </button>
        )}
      </div>

      {showHint && (
        <div className="callout hint-box">
          <strong>Hint:</strong>
          <MathTex text={problem.hint} />
        </div>
      )}

      {result && (
        <div className={`callout ${result.isCorrect ? 'ok-box' : 'err-box'}`}>
          <div className="result-banner">
            {result.isCorrect ? (
              <strong>✓ Correct! Well reasoned.</strong>
            ) : (
              <strong>
                ✗ Incorrect.{' '}
                {problem.type === 'numerical' &&
                  typeof result.correctValue === 'number' &&
                  `Expected value: ${result.correctValue}`}
              </strong>
            )}
          </div>
          <div className="solution-box">
            <strong>Step-by-Step Solution:</strong>
            <MathTex text={result.solution} />
          </div>
        </div>
      )}

      {problem.tags.length > 0 && (
        <div className="tag-row muted-tags">
          {problem.tags.map((t) => (
            <span key={t} className="micro-tag">
              #{t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
