"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OpenCodeLogo } from "@/components/icons";
import { ApiError, getMe, loginUrl } from "@/lib/api-client";

export default function SignInPage() {
  const [checking, setChecking] = useState(true);
  const [reconnect, setReconnect] = useState(false);

  useEffect(() => {
    // Reading window.location on mount avoids the useSearchParams Suspense
    // requirement introduced in Next 15+.
    setReconnect(
      new URL(window.location.href).searchParams.get("reconnect") === "1",
    );
  }, []);

  // If you already have a live session, bounce straight to the dashboard —
  // unless we're explicitly in reconnect mode (stale Google grant), in which
  // case the user needs to re-authorize even with a valid session cookie.
  useEffect(() => {
    const isReconnect =
      new URL(window.location.href).searchParams.get("reconnect") === "1";
    if (isReconnect) {
      setChecking(false);
      return;
    }
    getMe()
      .then(() => {
        window.location.href = "/app";
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          setChecking(false);
          return;
        }
        setChecking(false);
      });
  }, []);

  return (
    <main>
      <div
        className="mx-auto border-l border-r min-h-screen flex flex-col"
        style={{ maxWidth: "1080px", borderColor: "#3d3838" }}
      >
        {/* Header */}
        <header
          className="flex items-center justify-between min-h-[80px] px-[80px] border-b"
          style={{ backgroundColor: "#131010", borderColor: "#3d3838" }}
        >
          <Link href="/" aria-label="sheetforge home">
            <OpenCodeLogo />
          </Link>
          <Link
            href="/"
            className="text-sm transition-colors"
            style={{ color: "#b8b2b2" }}
          >
            ← What is sheetforge?
          </Link>
        </header>

        {/* Card */}
        <div className="flex-1 flex items-center justify-center px-[80px] py-[64px]">
          <div className="w-full max-w-md">
            <div
              className="border rounded p-8"
              style={{
                borderColor: "#3d3838",
                backgroundColor: "#1b1818",
              }}
            >
              <h1 className="text-[28px] font-bold leading-[36px] mb-2">
                {reconnect
                  ? "Re-authorize Google"
                  : "Sign in to sheetforge"}
              </h1>
              {reconnect ? (
                <p
                  style={{ color: "#b8b2b2" }}
                  className="text-sm mb-8 leading-[20px]"
                >
                  [!] Your Google connection expired or was revoked.
                  Re-authorize below to get your projects back online — nothing
                  in your sheetforge account is lost.
                </p>
              ) : (
                <p
                  style={{ color: "#b8b2b2" }}
                  className="text-sm mb-8 leading-[20px]"
                >
                  Connect your Google account to turn any Sheet into a
                  race-condition-safe API.
                </p>
              )}

              <a
                href={loginUrl()}
                className="flex items-center justify-center gap-3 w-full rounded px-6 py-3 font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#f2eded", color: "#131010" }}
              >
                <GoogleGlyph />
                {checking
                  ? "Checking session…"
                  : reconnect
                    ? "Reconnect Google"
                    : "Sign in with Google"}
              </a>

              <div
                className="mt-6 pt-6 border-t text-sm"
                style={{ borderColor: "#3d3838" }}
              >
                <p style={{ color: "#b8b2b2" }} className="mb-3 font-medium">
                  What we ask Google for:
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex gap-2">
                    <span style={{ color: "#716b6a" }}>[*]</span>
                    <span style={{ color: "#b8b2b2" }}>
                      your email and profile — to identify your account
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span style={{ color: "#716b6a" }}>[*]</span>
                    <span style={{ color: "#b8b2b2" }}>
                      access to the spreadsheets you connect — nothing
                      else in your Drive
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span style={{ color: "#716b6a" }}>[*]</span>
                    <span style={{ color: "#b8b2b2" }}>
                      offline access — so writes can process while you&apos;re
                      away
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <p
              style={{ color: "#7f7a7a" }}
              className="text-xs text-center mt-6 leading-[18px]"
            >
              You can revoke access at any time from your{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Google account settings
              </a>
              . sheetforge never sees your passwords.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function GoogleGlyph() {
  // Monochrome G — keeps the monospace aesthetic without trademark issues.
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fill="#131010"
        d="M12 11v2h5.5c-.2 1.3-1.6 3.8-5.5 3.8a5.8 5.8 0 1 1 0-11.6c1.8 0 3 .8 3.7 1.4l2.5-2.4A9.3 9.3 0 0 0 12 2a10 10 0 1 0 0 20c5.8 0 9.6-4 9.6-9.8 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}
