'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type AuthView = 'login' | 'register' | 'forgot';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthView>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'register' || tab === 'signup') {
      setMode('register');
    } else if (tab === 'forgot') {
      setMode('forgot');
    } else if (tab === 'login') {
      setMode('login');
    }
    const errParam = params.get('error');
    if (errParam) {
      setError(errParam);
    }
  }, []);

  const switchTab = (nextMode: AuthView) => {
    setMode(nextMode);
    setError('');
    setInfo('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
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
        setError(data.error || 'Incorrect email or password.');
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

  const handleSendResetCode = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error || 'Could not send verification code.');
        return;
      }
      setCodeSent(true);
      setInfo(
        data.message ||
          'Check your email for the 6-digit verification code.'
      );
    } catch {
      setError('Network error while requesting reset code.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: resetCode, newPassword }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error || 'Invalid or expired verification code.');
        return;
      }
      setMode('login');
      setCodeSent(false);
      setResetCode('');
      setNewPassword('');
      setPassword('');
      setInfo(data.message || 'Password updated! Log in with your new password.');
    } catch {
      setError('Network error while resetting password.');
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

      {info && (
        <div className="callout ok-box" style={{ marginTop: 0 }}>
          <strong>{info}</strong>
        </div>
      )}

      {mode === 'forgot' ? (
        <form
          onSubmit={codeSent ? handleConfirmReset : handleSendResetCode}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <p className="mu" style={{ margin: 0, textAlign: 'center' }}>
            {codeSent
              ? 'Enter the 6-digit code sent to your email and choose a new password.'
              : 'Enter your registered email to receive a 6-digit password reset code.'}
          </p>

          <label>
            Email Address
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={codeSent}
            />
          </label>

          {codeSent && (
            <>
              <label>
                6-Digit Verification Code
                <input
                  placeholder="e.g. 482910"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  required
                  minLength={6}
                  maxLength={8}
                />
              </label>

              <label>
                New Password (6+ characters)
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </label>
            </>
          )}

          {error && <p className="err">{error}</p>}

          <button type="submit" className="btn p" disabled={loading}>
            {loading
              ? 'Please wait…'
              : codeSent
                ? 'Verify Code & Reset Password'
                : 'Send Reset Code'}
          </button>

          <div className="bar">
            <a
              href="#"
              className="mu"
              onClick={(e) => {
                e.preventDefault();
                setCodeSent(false);
                switchTab('login');
              }}
            >
              ← Back to Login
            </a>
            {codeSent && (
              <a
                href="#"
                className="mu"
                onClick={(e) => {
                  e.preventDefault();
                  setCodeSent(false);
                  setError('');
                }}
              >
                Use different email
              </a>
            )}
          </div>
        </form>
      ) : (
        <>
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

            {mode === 'login' && (
              <div style={{ textAlign: 'right', marginTop: -4 }}>
                <a
                  href="#"
                  className="mu"
                  onClick={(e) => {
                    e.preventDefault();
                    setCodeSent(false);
                    switchTab('forgot');
                  }}
                >
                  Forgot password?
                </a>
              </div>
            )}

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
        </>
      )}
    </div>
  );
}
