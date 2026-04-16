"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CopyButton,
  DeleteIconButton,
  confirmAction,
  pushToast,
} from "@/components/ui";
import {
  type ApiKeyHandle,
  type SheetRecord,
  createApiKey,
  deleteProject,
  disconnectSheet,
  listApiKeys,
  listSheets,
  revokeApiKey,
} from "@/lib/api-client";

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const router = useRouter();

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

  async function onDeleteProject() {
    const ok = await confirmAction({
      title: "Delete this project?",
      body: "All of its API keys, connected sheets, and write-ledger history go with it. Your Google Sheets stay in your Drive. This cannot be undone.",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteProject(projectId);
      pushToast("project deleted", "success");
      router.push("/app");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      pushToast(`delete failed: ${msg}`, "error");
    }
  }

  async function onDisconnectSheet(s: SheetRecord) {
    const ok = await confirmAction({
      title: `Disconnect "${s.tabName}"?`,
      body: "The sheet stays in your Google Drive. sheetforge will just stop tracking it — existing API keys scoped to this sheet will start 404-ing for it.",
      destructive: true,
      confirmLabel: "disconnect",
    });
    if (!ok) return;
    try {
      await disconnectSheet(projectId, s.id);
      setSheets((prev) => (prev ? prev.filter((x) => x.id !== s.id) : prev));
      pushToast("sheet disconnected", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      pushToast(`disconnect failed: ${msg}`, "error");
    }
  }

  async function onRevokeKey(k: ApiKeyHandle) {
    const ok = await confirmAction({
      title: `Revoke key ${k.prefix}?`,
      body: "Any client using this key will start getting 401s immediately. Generate a new key if you still need access.",
      destructive: true,
      confirmLabel: "revoke",
    });
    if (!ok) return;
    try {
      await revokeApiKey(projectId, k.id);
      setApiKeys((prev) => (prev ? prev.filter((x) => x.id !== k.id) : prev));
      pushToast("key revoked", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      pushToast(`revoke failed: ${msg}`, "error");
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[38px] font-bold leading-[57px]">Project</h1>
            <p style={{ color: "#7f7a7a" }} className="text-sm mt-1">
              id: {projectId}
            </p>
          </div>
          <DeleteIconButton
            onClick={onDeleteProject}
            label="delete project"
            title="Delete this project"
          />
        </div>
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
              <li
                key={s.id}
                className="flex items-center gap-2 border rounded px-6 py-4"
                style={{ borderColor: "#3d3838", backgroundColor: "#1b1818" }}
              >
                <Link
                  href={`/app/projects/${projectId}/sheets/${s.id}`}
                  className="flex-1 flex items-center justify-between"
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
                <DeleteIconButton
                  onClick={() => onDisconnectSheet(s)}
                  label="disconnect"
                  title="Disconnect this sheet"
                />
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
                className="flex items-center justify-between gap-2 border rounded px-6 py-4"
                style={{ borderColor: "#3d3838", backgroundColor: "#1b1818" }}
              >
                <span>
                  <span style={{ color: "#716b6a" }}>[*]</span>{" "}
                  <code>{k.prefix}</code>
                </span>
                <span className="flex items-center gap-3">
                  <span style={{ color: "#7f7a7a" }} className="text-sm">
                    {k.lastUsedAt
                      ? `last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                      : "never used"}
                  </span>
                  <DeleteIconButton
                    onClick={() => onRevokeKey(k)}
                    label="revoke"
                    title="Revoke this API key"
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
