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
    const tab = params.get('tab');
    if (tab === 'register' || tab === 'signup') {
      setMode('register');
    } else if (tab === 'login') {
      setMode('login');
    }
    const errParam = params.get('error');
    if (errParam) {
      setError(errParam);
    }
  }, []);

  const switchTab = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setError('');
  };

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
    <div className="card narrow auth-card">
      <div className="tag-row" style={{ justifyContent: 'center' }}>
        <span className="tag purple">∫ Nirmal Calculus Studio</span>
      </div>

      <div className="tabs" role="tablist" aria-label="Authentication mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          className={`tab-btn ${mode === 'login' ? 'active' : ''}`}
          onClick={() => switchTab('login')}
        >
          Login
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          className={`tab-btn ${mode === 'register' ? 'active' : ''}`}
          onClick={() => switchTab('register')}
        >
          Sign Up
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <p className="mu" style={{ margin: 0, textAlign: 'center' }}>
          {mode === 'login'
            ? 'Sign in to access your mastery dashboard, mocks, and saved proofs.'
            : 'Create a free scholar account to track calculus mastery and compete.'}
        </p>

        {mode === 'register' && (
          <label>
            Full Name
            <input
              placeholder="e.g. Srinivasa Ramanujan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </label>
        )}

        <label>
          Email Address
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
            ? 'Authenticating…'
            : mode === 'login'
              ? 'Login with Email'
              : 'Create Scholar Account'}
        </button>
      </form>

      <div className="divider">
        <span>or continue with SSO</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <a href="/api/auth/sso/google" className="btn">
          Continue with Google (SSO)
        </a>
        <a href="/api/auth/sso/github" className="btn">
          Continue with GitHub (SSO)
        </a>
      </div>
    </div>
  );
}
