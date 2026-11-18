import { useEffect, useState, type ReactNode } from 'react';
import { ThemeToggle } from './layout/ThemeToggle';
export function AuthGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false),
    [checking, setChecking] = useState(true),
    [password, setPassword] = useState(''),
    [error, setError] = useState('');
  useEffect(() => {
    fetch('/api/auth', { cache: 'no-store' })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        setReady(data.authenticated === true);
      })
      .catch((e) => setError(e.message || 'Could not check your session.'))
      .finally(() => setChecking(false));
  }, []);
  if (ready)
    return (
      <>
        {children}
        <button
          className="glass-btn-secondary fixed bottom-3 right-3 z-40 px-3 py-2 rounded-xl text-xs"
          onClick={async () => {
            const response = await fetch('/api/auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'logout' }),
            });
            if (response.ok) {
              setReady(false);
              setPassword('');
            } else setError('Sign-out failed; try again.');
          }}
        >
          Sign out
        </button>
        {error && (
          <p
            role="alert"
            className="fixed bottom-14 right-3 z-40 glass-panel p-3 rounded-xl"
          >
            {error}
          </p>
        )}
      </>
    );
  return (
    <main className="app-shell min-h-screen flex items-center justify-center p-5">
      <div className="ambient-texture" aria-hidden="true" />
      <div className="glass-panel relative rounded-3xl p-8 w-full max-w-sm space-y-6">
        <div className="flex justify-between items-center">
          <span className="eyebrow">Your personal finance space</span>
          <ThemeToggle />
        </div>
        <div>
          <h1 className="text-3xl font-bold">AuraFinance</h1>
          <p className="text-sm text-slate-400 mt-3">
            A calmer place for your money.
          </p>
        </div>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setChecking(true);
            setError('');
            try {
              const r = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
              });
              const data = await r.json();
              if (!r.ok) throw new Error(data.error);
              setReady(true);
              setPassword('');
            } catch (e: any) {
              setError(e.message);
            } finally {
              setChecking(false);
            }
          }}
        >
          <label className="block text-sm">
            Password
            <input
              autoComplete="current-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="glass-input w-full mt-2"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          )}
          <button
            disabled={checking}
            className="glass-btn-primary rounded-xl px-5 py-3 w-full"
          >
            {checking ? 'Checking…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
