"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, getMe, loginUrl } from "@/lib/api-client";

interface User {
  userId: string;
  email: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMe()
      .then((res) => {
        setUser(res.user);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          window.location.href = loginUrl();
          return;
        }
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <main>
        <div
          className="mx-auto border-l border-r min-h-screen flex items-center justify-center"
          style={{ maxWidth: "1080px", borderColor: "#3d3838" }}
        >
          <span style={{ color: "#7f7a7a" }}>[*] loading session…</span>
        </div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main>
      <div
        className="mx-auto border-l border-r min-h-screen"
        style={{ maxWidth: "1080px", borderColor: "#3d3838" }}
      >
        <header
          className="sticky top-0 z-10 flex items-center justify-between min-h-[80px] px-[80px] border-b"
          style={{ backgroundColor: "#131010", borderColor: "#3d3838" }}
        >
          <Link href="/app" style={{ color: "#f2eded", fontWeight: 700 }}>
            [acid] <span style={{ color: "#7f7a7a" }}>dashboard</span>
          </Link>
          <nav className="flex items-center gap-8 text-sm">
            <Link
              href="/app"
              className="transition-colors"
              style={{ color: "#b8b2b2" }}
            >
              Projects
            </Link>
            <Link
              href="/"
              className="transition-colors"
              style={{ color: "#b8b2b2" }}
            >
              ← Marketing
            </Link>
            <span style={{ color: "#7f7a7a" }}>{user.email}</span>
          </nav>
        </header>
        <div className="px-[80px] py-[48px]">{children}</div>
      </div>
    </main>
  );
}
