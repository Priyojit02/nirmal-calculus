'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, name, email, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || 'Authentication failed.');
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const nextPath = params.get('next');
      router.push(nextPath && nextPath.startsWith('/') ? nextPath : '/dashboard');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="card narrow" onSubmit={handleSubmit}>
      <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
      <p className="mu">
        Track solved problems, bookmark hard proofs, and compete on the calculus
        leaderboard.
      </p>

      {mode === 'register' && (
        <label>
          Full Name
          <input
            placeholder="e.g. Srinivasa Ramanujan"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
      )}

      <label>
        Email
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>

      <label>
        Password (6+ characters)
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
      </label>

      {error && <p className="err">{error}</p>}

      <button type="submit" className="btn p" disabled={loading}>
        {loading
          ? 'Please wait…'
          : mode === 'login'
            ? 'Login'
            : 'Create Account'}
      </button>

      <p className="mu">
        {mode === 'login' ? 'New here? ' : 'Already have an account? '}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setError('');
            setMode(mode === 'login' ? 'register' : 'login');
          }}
        >
          {mode === 'login' ? 'Register' : 'Login'}
        </a>
      </p>
    </form>
  );
}
