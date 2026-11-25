'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errParam = params.get('error');
    if (errParam) {
      setError(errParam);
    }
  }, []);

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
      const data = (await res.json()) as {
        error?: string;
        user?: { role?: string };
      };
      if (!res.ok) {
        setError(data.error || 'Authentication failed.');
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const nextPath = params.get('next');
      const defaultDest =
        data.user?.role === 'super_admin' ? '/admin' : '/dashboard';
      router.push(nextPath && nextPath.startsWith('/') ? nextPath : defaultDest);
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card narrow">
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
        <p className="mu" style={{ margin: 0 }}>
          Sign in with JWT credentials or Single Sign-On (SSO).
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
      </form>

      <div
        style={{
          borderTop: '1px solid var(--ln)',
          paddingTop: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div className="mu" style={{ textAlign: 'center' }}>
          Or continue with SSO
        </div>
        <a href="/api/auth/sso/google" className="btn">
          Continue with Google (SSO)
        </a>
        <a href="/api/auth/sso/github" className="btn">
          Continue with GitHub (SSO)
        </a>
      </div>

      <p className="mu" style={{ margin: 0 }}>
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
    </div>
  );
}
