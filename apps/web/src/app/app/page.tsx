"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { type Project, listProjects } from "@/lib/api-client";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProjects()
      .then((res) => setProjects(res.projects))
      .catch((err) => setError(err.message));
  }, []);

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
            <li key={p.id}>
              <Link
                href={`/app/projects/${p.id}`}
                className="flex items-center justify-between border rounded px-6 py-4 transition-colors hover:opacity-90"
                style={{ borderColor: "#3d3838", backgroundColor: "#1b1818" }}
              >
                <span>
                  <span style={{ color: "#716b6a" }}>[*]</span>{" "}
                  <strong style={{ color: "#f2eded" }}>{p.name}</strong>
                </span>
                <span style={{ color: "#7f7a7a" }} className="text-sm">
                  {new Date(p.createdAt).toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
