"use client";

import { useEffect } from "react";
import { ApiError, getMe } from "@/lib/api-client";

/**
 * Root route — auth router.
 *
 * Signed in → /app (dashboard)
 * Signed out → /signin (consent landing)
 *
 * Marketing content lives at /welcome, linked from /signin and from any
 * external HN / Twitter post.
 */
export default function RootPage() {
  useEffect(() => {
    getMe()
      .then(() => {
        window.location.replace("/app");
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          window.location.replace("/signin");
          return;
        }
        // API unreachable → still send them to signin; the signin page
        // handles its own "API down" state more gracefully than this stub.
        window.location.replace("/signin");
      });
  }, []);

  return (
    <main>
      <div
        className="mx-auto border-l border-r min-h-screen flex items-center justify-center"
        style={{ maxWidth: "1080px", borderColor: "#3d3838" }}
      >
        <span style={{ color: "#7f7a7a" }}>[*] routing…</span>
      </div>
    </main>
  );
}
