"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  type SchemaSnapshot,
  getSchema,
  refreshSchema,
  sdkUrl,
} from "@/lib/api-client";

export default function SheetDetailPage() {
  const params = useParams<{ projectId: string; sheetId: string }>();
  const { projectId, sheetId } = params;

  const [schema, setSchema] = useState<SchemaSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    getSchema(projectId, sheetId)
      .then((res) => setSchema(res.schema))
      .catch((err) => setError(err.message));
  }, [projectId, sheetId]);

  async function onRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      const { schema: updated } = await refreshSchema(projectId, sheetId);
      setSchema(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown error");
    } finally {
      setRefreshing(false);
    }
  }

  const downloadUrl = sdkUrl(projectId, sheetId);

  return (
    <div className="space-y-10">
      <div>
        <Link
          href={`/app/projects/${projectId}`}
          className="text-sm mb-4 inline-block"
          style={{ color: "#7f7a7a" }}
        >
          ← back to project
        </Link>
        <h1 className="text-[38px] font-bold leading-[57px]">Sheet</h1>
      </div>

      {error && (
        <p style={{ color: "#b8b2b2" }}>
          [!] {error}
        </p>
      )}

      {/* ── Schema ─────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-bold">Inferred schema</h2>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="rounded px-4 py-2 font-medium border transition-colors disabled:opacity-50"
            style={{ borderColor: "#3d3838", color: "#b8b2b2" }}
          >
            {refreshing ? "Refreshing…" : "re-infer from sheet"}
          </button>
        </div>

        {schema === null ? (
          <p style={{ color: "#7f7a7a" }}>[*] loading schema…</p>
        ) : (
          <div
            className="border rounded"
            style={{ borderColor: "#3d3838", backgroundColor: "#1b1818" }}
          >
            <div
              className="px-6 py-3 flex items-center justify-between border-b text-sm"
              style={{ borderColor: "#3d3838" }}
            >
              <span style={{ color: "#b8b2b2" }}>
                v{schema.version} ·{" "}
                {new Date(schema.generatedAt).toLocaleString()}
              </span>
              <span style={{ color: "#7f7a7a" }}>
                {schema.columns.length} columns
              </span>
            </div>
            <ul>
              {schema.columns.map((col) => (
                <li
                  key={col.name}
                  className="px-6 py-3 flex items-center justify-between border-b last:border-b-0 text-sm"
                  style={{ borderColor: "#3d3838" }}
                >
                  <span>
                    <span style={{ color: "#716b6a" }}>[*]</span>{" "}
                    <strong>{col.name}</strong>
                    {col.nullable && (
                      <span style={{ color: "#7f7a7a" }}>?</span>
                    )}
                  </span>
                  <span style={{ color: "#b8b2b2" }}>{col.type}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ── SDK ────────────────────────────────────────────── */}
      <section>
        <h2 className="text-[16px] font-bold mb-4">Typed TypeScript SDK</h2>
        <p style={{ color: "#b8b2b2" }} className="mb-4 text-sm">
          Commit this file to your repo. No runtime dependency on a published
          client — just <code>fetch</code>. Regenerate whenever headers
          change.
        </p>
        <div className="flex gap-3">
          <a
            href={downloadUrl}
            download="client.ts"
            className="rounded px-6 py-2 font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#f2eded", color: "#131010" }}
          >
            ↓ download client.ts
          </a>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded px-6 py-2 border transition-colors"
            style={{ borderColor: "#3d3838", color: "#b8b2b2" }}
          >
            preview in new tab
          </a>
        </div>

        <div
          className="mt-6 border rounded p-4 text-sm overflow-x-auto"
          style={{ borderColor: "#3d3838", backgroundColor: "#131010" }}
        >
          <pre style={{ color: "#b8b2b2" }}>
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
