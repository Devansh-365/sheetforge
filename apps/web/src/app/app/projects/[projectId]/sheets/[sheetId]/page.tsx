'use client';

import { CopyButton, DeleteIconButton, confirmAction, pushToast } from '@/components/ui';
import {
  type LedgerStats,
  type PreviewResult,
  type SchemaSnapshot,
  type TestWriteResult,
  disconnectSheet,
  getLedgerStats,
  getSchema,
  previewSheet,
  refreshSchema,
  sdkUrl,
  testWrite,
} from '@/lib/api-client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SheetDetailPage() {
  const params = useParams<{ projectId: string; sheetId: string }>();
  const { projectId, sheetId } = params;
  const router = useRouter();

  async function onDisconnect() {
    const ok = await confirmAction({
      title: 'Disconnect this sheet?',
      body: 'The sheet stays in your Google Drive. sheetforge will stop tracking it and existing API keys scoped to this sheet will start 404-ing.',
      destructive: true,
      confirmLabel: 'disconnect',
    });
    if (!ok) return;
    try {
      await disconnectSheet(projectId, sheetId);
      pushToast('sheet disconnected', 'success');
      router.push(`/app/projects/${projectId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      pushToast(`disconnect failed: ${msg}`, 'error');
    }
  }

  const [schema, setSchema] = useState<SchemaSnapshot | null>(null);
  const [ledger, setLedger] = useState<LedgerStats | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastWrite, setLastWrite] = useState<TestWriteResult | null>(null);

  useEffect(() => {
    getSchema(projectId, sheetId)
      .then((res) => setSchema(res.schema))
      .catch((err) => setError(err.message));
  }, [projectId, sheetId]);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      getLedgerStats(projectId, sheetId)
        .then((res) => {
          if (!cancelled) setLedger(res);
        })
        .catch(() => {
          /* panel stays stale; the schema-load path surfaces real failures */
        });
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [projectId, sheetId]);

  async function onRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      const { schema: updated } = await refreshSchema(projectId, sheetId);
      setSchema(updated);
      pushToast('schema re-inferred', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      setError(msg);
      pushToast(msg, 'error');
    } finally {
      setRefreshing(false);
    }
  }

  async function onTestWrite() {
    setSubmitting(true);
    try {
      const result = await testWrite(projectId, sheetId);
      setLastWrite(result);
      pushToast(`submitted writeId ${result.writeId.slice(0, 8)}… — watch the ledger`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      pushToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function loadPreview() {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const result = await previewSheet(projectId, sheetId, 10);
      setPreview(result);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'unknown error');
    } finally {
      setPreviewLoading(false);
    }
  }

  // Auto-load preview once the schema is available so the row grid shows up
  // without an extra click.
  useEffect(() => {
    if (schema === null) return;
    loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema === null ? null : schema.id]);

  const downloadUrl = sdkUrl(projectId, sheetId);

  return (
    <div className="space-y-10">
      <div>
        <Link
          href={`/app/projects/${projectId}`}
          className="text-sm mb-4 inline-block"
          style={{ color: '#7f7a7a' }}
        >
          ← back to project
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[38px] font-bold leading-[57px]">Sheet</h1>
              <CopyButton value={sheetId} label="copy sheet id" />
            </div>
            <p style={{ color: '#7f7a7a' }} className="text-sm">
              id: {sheetId}
            </p>
          </div>
          <DeleteIconButton
            onClick={onDisconnect}
            label="disconnect"
            title="Disconnect this sheet"
          />
        </div>
      </div>

      {error && <p style={{ color: '#b8b2b2' }}>[!] {error}</p>}

      {/* ── Schema ─────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-bold">Inferred schema</h2>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="rounded px-4 py-2 font-medium border transition-colors disabled:opacity-50"
            style={{ borderColor: '#3d3838', color: '#b8b2b2' }}
          >
            {refreshing ? 'Refreshing…' : 're-infer from sheet'}
          </button>
        </div>

        {schema === null ? (
          <p style={{ color: '#7f7a7a' }}>[*] loading schema…</p>
        ) : (
          <div
            className="border rounded"
            style={{ borderColor: '#3d3838', backgroundColor: '#1b1818' }}
          >
            <div
              className="px-6 py-3 flex items-center justify-between border-b text-sm"
              style={{ borderColor: '#3d3838' }}
            >
              <span style={{ color: '#b8b2b2' }}>
                v{schema.version} · {new Date(schema.generatedAt).toLocaleString()}
              </span>
              <span style={{ color: '#7f7a7a' }}>{schema.columns.length} columns</span>
            </div>
            <ul>
              {schema.columns.map((col) => (
                <li
                  key={col.name}
                  className="px-6 py-3 flex items-center justify-between border-b last:border-b-0 text-sm"
                  style={{ borderColor: '#3d3838' }}
                >
                  <span>
                    <span style={{ color: '#716b6a' }}>[*]</span> <strong>{col.name}</strong>
                    {col.nullable && <span style={{ color: '#7f7a7a' }}>?</span>}
                  </span>
                  <span style={{ color: '#b8b2b2' }}>{col.type}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ── Test write ─────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-bold">Test write</h2>
          <button
            type="button"
            onClick={onTestWrite}
            disabled={submitting || schema === null}
            className="rounded px-4 py-2 font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#f2eded', color: '#131010' }}
          >
            {submitting ? 'Submitting…' : '+ submit demo row'}
          </button>
        </div>
        <p style={{ color: '#b8b2b2' }} className="text-sm mb-4">
          Generates a row matching the schema and enqueues it through
          <code> submitWrite()</code>. Watch the ledger below flip from pending → completed in ~1s.
        </p>
        {lastWrite && (
          <div
            className="border rounded p-4 text-sm"
            style={{ borderColor: '#3d3838', backgroundColor: '#131010' }}
          >
            <p style={{ color: '#7f7a7a' }} className="mb-2">
              last submitted writeId <code style={{ color: '#f2eded' }}>{lastWrite.writeId}</code>{' '}
              <span style={{ color: '#b8b2b2' }}>({lastWrite.status})</span>
            </p>
            <pre style={{ color: '#b8b2b2' }} className="overflow-x-auto">
              {JSON.stringify(lastWrite.submittedRow, null, 2)}
            </pre>
          </div>
        )}
      </section>

      {/* ── Ledger panel ───────────────────────────────────── */}
      <section>
        <h2 className="text-[16px] font-bold mb-4">Write ledger</h2>
        {ledger === null ? (
          <p style={{ color: '#7f7a7a' }}>[*] loading ledger…</p>
        ) : (
          <>
            <div className="grid grid-cols-5 gap-3 mb-4">
              {(
                [
                  ['pending', ledger.stats.pending],
                  ['processing', ledger.stats.processing],
                  ['completed', ledger.stats.completed],
                  ['failed', ledger.stats.failed],
                  ['dead_lettered', ledger.stats.dead_lettered],
                ] as const
              ).map(([label, count]) => (
                <div
                  key={label}
                  className="border rounded p-3"
                  style={{
                    borderColor: '#3d3838',
                    backgroundColor: '#1b1818',
                  }}
                >
                  <p style={{ color: '#7f7a7a' }} className="text-xs mb-1 lowercase">
                    {label}
                  </p>
                  <p style={{ color: '#f2eded' }} className="text-2xl font-bold">
                    {count}
                  </p>
                </div>
              ))}
            </div>

            {ledger.recent.length === 0 ? (
              <p style={{ color: '#7f7a7a' }} className="text-sm">
                no writes yet — use the Test write button above
              </p>
            ) : (
              <div
                className="border rounded overflow-hidden"
                style={{ borderColor: '#3d3838', backgroundColor: '#1b1818' }}
              >
                <div
                  className="grid grid-cols-12 gap-2 px-4 py-2 text-xs border-b"
                  style={{ borderColor: '#3d3838', color: '#7f7a7a' }}
                >
                  <span className="col-span-5">writeId</span>
                  <span className="col-span-3">status</span>
                  <span className="col-span-2">enqueued</span>
                  <span className="col-span-2 text-right">completed</span>
                </div>
                <ul>
                  {ledger.recent.map((r) => (
                    <li
                      key={r.id}
                      className="grid grid-cols-12 gap-2 px-4 py-2 text-xs border-b last:border-b-0"
                      style={{ borderColor: '#3d3838' }}
                    >
                      <code className="col-span-5" style={{ color: '#b8b2b2' }}>
                        {r.writeId.slice(0, 12)}…
                      </code>
                      <span
                        className="col-span-3"
                        style={{
                          color:
                            r.status === 'completed'
                              ? '#f2eded'
                              : r.status === 'failed'
                                ? '#f2eded'
                                : '#b8b2b2',
                        }}
                      >
                        {r.status}
                      </span>
                      <span className="col-span-2" style={{ color: '#7f7a7a' }}>
                        {new Date(r.enqueuedAt).toLocaleTimeString()}
                      </span>
                      <span className="col-span-2 text-right" style={{ color: '#7f7a7a' }}>
                        {r.completedAt ? new Date(r.completedAt).toLocaleTimeString() : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Row preview ────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-bold">Row preview</h2>
          <button
            type="button"
            onClick={loadPreview}
            disabled={previewLoading || schema === null}
            className="rounded px-4 py-2 font-medium border transition-colors disabled:opacity-50"
            style={{ borderColor: '#3d3838', color: '#b8b2b2' }}
          >
            {previewLoading ? 'Loading…' : 'refresh preview'}
          </button>
        </div>
        <p style={{ color: '#b8b2b2' }} className="text-sm mb-4">
          First 10 rows read through the API — the same path an API-key client hits. Verifies the
          whole read loop end-to-end without curl.
        </p>

        {previewError && (
          <p style={{ color: '#b8b2b2' }} className="text-sm mb-4">
            [!] {previewError}
          </p>
        )}

        {preview === null && !previewError && (
          <p style={{ color: '#7f7a7a' }} className="text-sm">
            [*] loading preview…
          </p>
        )}

        {preview !== null && preview.rows.length === 0 && (
          <p style={{ color: '#7f7a7a' }} className="text-sm">
            sheet has no data rows yet — use the Test write button above
          </p>
        )}

        {preview !== null && preview.rows.length > 0 && (
          <div
            className="border rounded overflow-x-auto"
            style={{ borderColor: '#3d3838', backgroundColor: '#1b1818' }}
          >
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: '#3d3838' }}>
                  {preview.columns.map((col) => (
                    <th
                      key={col.name}
                      className="text-left px-4 py-2 font-medium"
                      style={{ color: '#7f7a7a' }}
                    >
                      {col.name} <span style={{ color: '#4a4545' }}>: {col.type}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b last:border-b-0"
                    style={{ borderColor: '#3d3838' }}
                  >
                    {preview.columns.map((col) => {
                      const v = row[col.name];
                      return (
                        <td
                          key={col.name}
                          className="px-4 py-2"
                          style={{ color: v == null ? '#4a4545' : '#b8b2b2' }}
                        >
                          {v == null ? '—' : String(v)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── SDK ────────────────────────────────────────────── */}
      <section>
        <h2 className="text-[16px] font-bold mb-4">Typed TypeScript SDK</h2>
        <p style={{ color: '#b8b2b2' }} className="mb-4 text-sm">
          Commit this file to your repo. No runtime dependency on a published client — just{' '}
          <code>fetch</code>. Regenerate whenever headers change.
        </p>
        <div className="flex gap-3">
          <a
            href={downloadUrl}
            download="client.ts"
            className="rounded px-6 py-2 font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#f2eded', color: '#131010' }}
          >
            ↓ download client.ts
          </a>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded px-6 py-2 border transition-colors"
            style={{ borderColor: '#3d3838', color: '#b8b2b2' }}
          >
            preview in new tab
          </a>
        </div>

        <div
          className="mt-6 border rounded p-4 text-sm overflow-x-auto"
          style={{ borderColor: '#3d3838', backgroundColor: '#131010' }}
        >
          <pre style={{ color: '#b8b2b2' }}>
            {`// usage (after downloading client.ts):
import { createWaitlistClient } from './client';

const client = createWaitlistClient({ apiKey: 'sk_live_...' });
await client.create({ email: 'hi@example.com' }, {
  idempotencyKey: crypto.randomUUID(),
});`}
          </pre>
        </div>
      </section>
    </div>
  );
}
