"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CopyButton, pushToast } from "@/components/ui";
import {
  type ApiKeyHandle,
  type SheetRecord,
  createApiKey,
  listApiKeys,
  listSheets,
} from "@/lib/api-client";

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  const [sheets, setSheets] = useState<SheetRecord[] | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeyHandle[] | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listSheets(projectId), listApiKeys(projectId)])
      .then(([s, k]) => {
        setSheets(s.sheets);
        setApiKeys(k.apiKeys);
      })
      .catch((err) => setError(err.message));
  }, [projectId]);

  async function onCreateKey() {
    setCreatingKey(true);
    setError(null);
    try {
      const { handle, plaintextKey } = await createApiKey(projectId);
      setRevealedKey(plaintextKey);
      setApiKeys((prev) => (prev ? [...prev, handle] : [handle]));
      pushToast("api key created", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      setError(msg);
      pushToast(`create key failed: ${msg}`, "error");
    } finally {
      setCreatingKey(false);
    }
  }

  return (
    <div className="space-y-12">
      <div>
        <Link
          href="/app"
          className="text-sm mb-4 inline-block"
          style={{ color: "#7f7a7a" }}
        >
          ← back to projects
        </Link>
        <h1 className="text-[38px] font-bold leading-[57px]">Project</h1>
        <p style={{ color: "#7f7a7a" }} className="text-sm mt-1">
          id: {projectId}
        </p>
      </div>

      {error && (
        <p style={{ color: "#b8b2b2" }}>
          [!] {error}
        </p>
      )}

      {/* ── Sheets ─────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-bold">Connected sheets</h2>
          <Link
            href={`/app/projects/${projectId}/sheets/new`}
            className="rounded px-4 py-2 font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#f2eded", color: "#131010" }}
          >
            + connect sheet
          </Link>
        </div>

        {sheets === null && (
          <p style={{ color: "#7f7a7a" }}>[*] loading sheets…</p>
        )}
        {sheets !== null && sheets.length === 0 && (
          <p style={{ color: "#b8b2b2" }}>
            No sheets connected yet. Connect one to auto-generate a typed SDK.
          </p>
        )}
        {sheets !== null && sheets.length > 0 && (
          <ul className="space-y-2">
            {sheets.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/app/projects/${projectId}/sheets/${s.id}`}
                  className="flex items-center justify-between border rounded px-6 py-4"
                  style={{ borderColor: "#3d3838", backgroundColor: "#1b1818" }}
                >
                  <span>
                    <span style={{ color: "#716b6a" }}>[*]</span>{" "}
                    <strong>{s.tabName}</strong>{" "}
                    <span style={{ color: "#7f7a7a" }} className="text-sm ml-2">
                      {s.googleSheetId.slice(0, 12)}…
                    </span>
                  </span>
                  <span style={{ color: "#7f7a7a" }} className="text-sm">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── API keys ───────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-bold">API keys</h2>
          <button
            type="button"
            onClick={onCreateKey}
            disabled={creatingKey}
            className="rounded px-4 py-2 font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#f2eded", color: "#131010" }}
          >
            {creatingKey ? "Creating…" : "+ create key"}
          </button>
        </div>

        {revealedKey && (
          <div
            className="border rounded p-6 mb-4"
            style={{ borderColor: "#3d3838", backgroundColor: "#1b1818" }}
          >
            <div className="flex items-center justify-between mb-3">
              <p style={{ color: "#b8b2b2" }} className="text-sm">
                [!] copy this key now — it will not be shown again
              </p>
              <CopyButton value={revealedKey} label="copy key" />
            </div>
            <code
              className="block font-bold break-all"
              style={{ color: "#f2eded" }}
            >
              {revealedKey}
            </code>
          </div>
        )}

        {apiKeys === null && (
          <p style={{ color: "#7f7a7a" }}>[*] loading keys…</p>
        )}
        {apiKeys !== null && apiKeys.length === 0 && (
          <p style={{ color: "#b8b2b2" }}>No keys yet.</p>
        )}
        {apiKeys !== null && apiKeys.length > 0 && (
          <ul className="space-y-2">
            {apiKeys.map((k) => (
              <li
                key={k.id}
                className="flex items-center justify-between border rounded px-6 py-4"
                style={{ borderColor: "#3d3838", backgroundColor: "#1b1818" }}
              >
                <span>
                  <span style={{ color: "#716b6a" }}>[*]</span>{" "}
                  <code>{k.prefix}</code>
                </span>
                <span style={{ color: "#7f7a7a" }} className="text-sm">
                  {k.lastUsedAt
                    ? `last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                    : "never used"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
