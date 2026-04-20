'use client';

import { createProject } from '@/lib/api-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const { project } = await createProject(name.trim());
      router.push(`/app/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown error');
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <Link href="/app" className="text-sm mb-4 inline-block" style={{ color: '#7f7a7a' }}>
        ← back to projects
      </Link>
      <h1 className="text-[38px] font-bold leading-[57px] mb-8">New project</h1>

      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm mb-2" style={{ color: '#b8b2b2' }}>
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. waitlist"
            className="w-full border rounded px-4 py-2 bg-transparent focus:outline-none transition-colors"
            style={{ borderColor: '#3d3838', color: '#f2eded' }}
          />
        </div>

        {error && <p style={{ color: '#b8b2b2' }}>[!] {error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="rounded px-6 py-2 font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#22c55e', color: '#0c0c0e' }}
          >
            {submitting ? 'Creating…' : 'Create project'}
          </button>
          <Link
            href="/app"
            className="rounded px-6 py-2 border transition-colors"
            style={{ borderColor: '#3d3838', color: '#b8b2b2' }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
