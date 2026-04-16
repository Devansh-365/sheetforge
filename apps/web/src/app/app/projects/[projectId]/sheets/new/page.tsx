"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { connectSheet } from "@/lib/api-client";

export default function NewSheetPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const router = useRouter();

  const [url, setUrl] = useState("");
  const [tabName, setTabName] = useState("Sheet1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const googleSheetId = extractSheetId(url) ?? url.trim();
      if (!googleSheetId) {
        throw new Error("paste a Google Sheets URL or sheet id");
      }
      const { sheet } = await connectSheet(
        projectId,
        googleSheetId,
        tabName.trim(),
      );
      router.push(`/app/projects/${projectId}/sheets/${sheet.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown error");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl">
      <Link
        href={`/app/projects/${projectId}`}
        className="text-sm mb-4 inline-block"
        style={{ color: "#7f7a7a" }}
      >
        ← back to project
      </Link>
      <h1 className="text-[38px] font-bold leading-[57px] mb-8">
        Connect a sheet
      </h1>

      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="url"
            className="block text-sm mb-2"
            style={{ color: "#b8b2b2" }}
          >
            Google Sheets URL or ID
          </label>
          <input
            id="url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            autoFocus
            className="w-full border rounded px-4 py-2 bg-transparent focus:outline-none"
            style={{ borderColor: "#3d3838", color: "#f2eded" }}
          />
          <p style={{ color: "#7f7a7a" }} className="text-sm mt-1">
            The sheet must be shared with your Google account. The first row is
            used as column headers.
          </p>
        </div>

        <div>
          <label
            htmlFor="tab"
            className="block text-sm mb-2"
            style={{ color: "#b8b2b2" }}
          >
            Tab name
          </label>
          <input
            id="tab"
            type="text"
            value={tabName}
            onChange={(e) => setTabName(e.target.value)}
            className="w-full border rounded px-4 py-2 bg-transparent focus:outline-none"
            style={{ borderColor: "#3d3838", color: "#f2eded" }}
          />
        </div>

        {error && (
          <p style={{ color: "#b8b2b2" }}>
            [!] {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded px-6 py-2 font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#f2eded", color: "#131010" }}
          >
            {submitting ? "Connecting…" : "Connect sheet"}
          </button>
          <Link
            href={`/app/projects/${projectId}`}
            className="rounded px-6 py-2 border"
            style={{ borderColor: "#3d3838", color: "#b8b2b2" }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function extractSheetId(input: string): string | null {
  const match = input.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}
