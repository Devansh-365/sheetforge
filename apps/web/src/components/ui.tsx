"use client";

import { useCallback, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Toast — minimal stack, no external deps. Import `useToast` at the page level
// and call `push("message", "success" | "error" | "info")` from any handler.
// ---------------------------------------------------------------------------

type ToastKind = "success" | "error" | "info";
interface ToastEntry {
  id: number;
  kind: ToastKind;
  message: string;
}

let nextId = 1;
const listeners = new Set<(t: ToastEntry[]) => void>();
let current: ToastEntry[] = [];

function emit() {
  for (const fn of listeners) fn(current);
}

export function pushToast(message: string, kind: ToastKind = "info") {
  const entry: ToastEntry = { id: nextId++, kind, message };
  current = [...current, entry];
  emit();
  setTimeout(() => {
    current = current.filter((t) => t.id !== entry.id);
    emit();
  }, 4500);
}

export function ToastHost() {
  const [items, setItems] = useState<ToastEntry[]>([]);
  useEffect(() => {
    const fn = (next: ToastEntry[]) => setItems(next);
    listeners.add(fn);
    fn(current);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  if (items.length === 0) return null;
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm"
      aria-live="polite"
    >
      {items.map((t) => (
        <div
          key={t.id}
          className="border rounded px-4 py-3 text-sm"
          style={{
            borderColor: "#3d3838",
            backgroundColor: "#1b1818",
            color:
              t.kind === "error"
                ? "#f2eded"
                : t.kind === "success"
                  ? "#f2eded"
                  : "#b8b2b2",
          }}
        >
          <span style={{ color: "#716b6a" }}>
            {t.kind === "error" ? "[!]" : t.kind === "success" ? "[✓]" : "[*]"}
          </span>{" "}
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CopyButton — inline button that copies its value to clipboard and flashes
// a "copied!" label. Uses the toast host so feedback is consistent.
// ---------------------------------------------------------------------------

export function CopyButton({
  value,
  label = "copy",
  className,
  style,
}: {
  value: string;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      pushToast("copied to clipboard", "success");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      pushToast("clipboard blocked by browser", "error");
    }
  }, [value]);

  return (
    <button
      type="button"
      onClick={onCopy}
      className={`rounded px-3 py-1 text-xs border transition-colors ${className ?? ""}`}
      style={{
        borderColor: "#3d3838",
        color: copied ? "#f2eded" : "#b8b2b2",
        ...style,
      }}
    >
      {copied ? "copied!" : label}
    </button>
  );
}
