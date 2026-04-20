'use client';

import { ConfirmHost, ToastHost, pushToast } from '@/components/ui';
import { ApiError, getMe, logout } from '@/lib/api-client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface User {
  userId: string;
  email: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe()
      .then((res) => {
        setUser(res.user);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          // Send users to the proper sign-in landing, not straight to
          // Google — they get a chance to read what they're consenting to.
          window.location.href = '/signin';
          return;
        }
        // Network / CORS / API-down → show a real message, don't go blank.
        setError(err instanceof Error ? err.message : 'could not reach the API');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <main>
        <div
          className="mx-auto border-l border-r min-h-screen flex items-center justify-center"
          style={{ maxWidth: '1080px', borderColor: '#3d3838' }}
        >
          <span style={{ color: '#7f7a7a' }}>[*] loading session…</span>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main>
        <div
          className="mx-auto border-l border-r min-h-screen px-5 md:px-[80px] py-10 md:py-[64px]"
          style={{ maxWidth: '1080px', borderColor: '#3d3838' }}
        >
          <h1 className="text-[28px] md:text-[38px] font-bold leading-[36px] md:leading-[57px] mb-4">
            API unreachable
          </h1>
          <div
            className="mb-6 rounded border px-3 py-2 text-sm leading-[20px] flex items-start gap-2"
            style={{
              borderColor: '#14532d',
              backgroundColor: '#0f1a12',
              color: '#86efac',
            }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full mt-2 shrink-0"
              style={{ backgroundColor: '#22c55e' }}
              aria-hidden="true"
            />
            <span>
              sheetforge is self-host only for now — the dashboard talks to your own API. Hosted
              SaaS is on the way.{' '}
              <a
                href="https://github.com/Devansh-365/sheetforge#quickstart"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ color: '#bbf7d0' }}
              >
                Self-host guide →
              </a>
            </span>
          </div>
          <p style={{ color: '#b8b2b2' }} className="mb-2">
            [!] The dashboard couldn&apos;t reach the sheetforge API at{' '}
            <code style={{ color: '#4ade80' }}>{API_URL}</code>.
          </p>
          {error && (
            <p style={{ color: '#7f7a7a' }} className="text-sm mb-6">
              {error}
            </p>
          )}
          <div
            className="border rounded p-6 mb-6"
            style={{ borderColor: '#3d3838', backgroundColor: '#1b1818' }}
          >
            <p style={{ color: '#b8b2b2' }} className="text-sm mb-3">
              Start the API in another terminal:
            </p>
            <code style={{ color: '#4ade80' }}>pnpm --filter @sheetforge/api dev</code>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded px-6 py-2 font-medium"
            style={{ backgroundColor: '#22c55e', color: '#0c0c0e' }}
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div
        className="mx-auto border-l border-r min-h-screen"
        style={{ maxWidth: '1080px', borderColor: '#3d3838' }}
      >
        <header
          className="sticky top-0 z-10 flex items-center justify-between gap-3 min-h-[64px] md:min-h-[80px] px-4 md:px-[80px] border-b"
          style={{ backgroundColor: '#131010', borderColor: '#3d3838' }}
        >
          <Link href="/app" style={{ color: '#f2eded', fontWeight: 700 }}>
            <span style={{ color: '#22c55e' }}>[</span>sheetforge
            <span style={{ color: '#22c55e' }}>]</span>{' '}
            <span style={{ color: '#7f7a7a' }}>dashboard</span>
          </Link>
          <nav className="flex items-center gap-3 md:gap-8 text-xs md:text-sm">
            <Link
              href="/app"
              className="hidden sm:inline transition-colors"
              style={{ color: '#b8b2b2' }}
            >
              Projects
            </Link>
            <Link href="/" className="transition-colors" style={{ color: '#b8b2b2' }}>
              ← Home
            </Link>
            <span className="hidden md:inline truncate max-w-[160px]" style={{ color: '#7f7a7a' }}>
              {user.email}
            </span>
            <button
              type="button"
              onClick={async () => {
                try {
                  await logout();
                  pushToast('signed out', 'success');
                  window.location.href = '/signin';
                } catch {
                  pushToast('logout failed', 'error');
                }
              }}
              className="rounded px-3 py-1 border text-xs transition-colors"
              style={{ borderColor: '#3d3838', color: '#b8b2b2' }}
            >
              sign out
            </button>
          </nav>
        </header>
        <div className="px-5 md:px-[80px] py-8 md:py-[48px]">{children}</div>
      </div>
      <ToastHost />
      <ConfirmHost />
    </main>
  );
}
