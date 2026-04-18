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
          className="mx-auto border-l border-r min-h-screen px-[80px] py-[64px]"
          style={{ maxWidth: '1080px', borderColor: '#3d3838' }}
        >
          <h1 className="text-[38px] font-bold leading-[57px] mb-4">API unreachable</h1>
          <p style={{ color: '#b8b2b2' }} className="mb-2">
            [!] The dashboard couldn&apos;t reach the sheetforge API at{' '}
            <code style={{ color: '#f2eded' }}>{API_URL}</code>.
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
            <code style={{ color: '#f2eded' }}>pnpm --filter @sheetforge/api dev</code>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded px-6 py-2 font-medium"
            style={{ backgroundColor: '#f2eded', color: '#131010' }}
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
          className="sticky top-0 z-10 flex items-center justify-between min-h-[80px] px-[80px] border-b"
          style={{ backgroundColor: '#131010', borderColor: '#3d3838' }}
        >
          <Link href="/app" style={{ color: '#f2eded', fontWeight: 700 }}>
            [sheetforge] <span style={{ color: '#7f7a7a' }}>dashboard</span>
          </Link>
          <nav className="flex items-center gap-8 text-sm">
            <Link href="/app" className="transition-colors" style={{ color: '#b8b2b2' }}>
              Projects
            </Link>
            <Link href="/" className="transition-colors" style={{ color: '#b8b2b2' }}>
              ← Home
            </Link>
            <span style={{ color: '#7f7a7a' }}>{user.email}</span>
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
        <div className="px-[80px] py-[48px]">{children}</div>
      </div>
      <ToastHost />
      <ConfirmHost />
    </main>
  );
}
