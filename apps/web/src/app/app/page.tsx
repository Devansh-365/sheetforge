"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DeleteIconButton, confirmAction, pushToast } from "@/components/ui";
import {
  type Project,
  deleteProject,
  listProjects,
} from "@/lib/api-client";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProjects()
      .then((res) => setProjects(res.projects))
      .catch((err) => setError(err.message));
  }, []);

  async function onDelete(p: Project) {
    const ok = await confirmAction({
      title: `Delete project "${p.name}"?`,
      body: "This also deletes the project's API keys, connected sheets, and write-ledger history. Your Google Sheets aren't touched — they stay in your Drive. This action cannot be undone.",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteProject(p.id);
      setProjects((prev) =>
        prev ? prev.filter((x) => x.id !== p.id) : prev,
      );
      pushToast("project deleted", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown error";
      pushToast(`delete failed: ${msg}`, "error");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-[38px] font-bold leading-[57px]">Projects</h1>
        <Link
          href="/app/projects/new"
          className="rounded px-4 py-2 font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#f2eded", color: "#131010" }}
        >
          + new project
        </Link>
      </div>

      {error && (
        <p style={{ color: "#b8b2b2" }} className="mb-4">
          [!] {error}
        </p>
      )}

      {projects === null && !error && (
        <p style={{ color: "#7f7a7a" }}>[*] loading projects…</p>
      )}

      {projects !== null && projects.length === 0 && (
        <div
          className="border rounded p-8 text-center"
          style={{ borderColor: "#3d3838" }}
        >
          <p style={{ color: "#b8b2b2" }} className="mb-4">
            No projects yet. Each project holds API keys and connected sheets.
          </p>
          <Link
            href="/app/projects/new"
            className="rounded px-4 py-2 font-medium inline-block"
            style={{ backgroundColor: "#f2eded", color: "#131010" }}
          >
            Create your first project
          </Link>
        </div>
      )}

      {projects !== null && projects.length > 0 && (
        <ul className="space-y-2">
          {projects.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 border rounded px-6 py-4"
              style={{ borderColor: "#3d3838", backgroundColor: "#1b1818" }}
            >
              <Link
                href={`/app/projects/${p.id}`}
                className="flex-1 flex items-center justify-between transition-colors hover:opacity-90"
              >
                <span>
                  <span style={{ color: "#716b6a" }}>[*]</span>{" "}
                  <strong style={{ color: "#f2eded" }}>{p.name}</strong>
                </span>
                <span style={{ color: "#7f7a7a" }} className="text-sm">
                  {new Date(p.createdAt).toLocaleDateString()}
                </span>
              </Link>
              <DeleteIconButton
                onClick={() => onDelete(p)}
                label="delete"
                title="Delete project"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
