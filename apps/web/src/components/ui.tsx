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

// ---------------------------------------------------------------------------
// ConfirmDialog — promise-based API. `await confirmAction({...})` resolves
// with the user's choice (true = confirm, false = cancel / backdrop click).
// Requires <ConfirmHost /> mounted once (in the dashboard layout).
// ---------------------------------------------------------------------------

interface ConfirmRequest {
  title: string;
  body?: string;
  confirmLabel?: string;
  destructive?: boolean;
  resolve: (ok: boolean) => void;
}

let pendingConfirm: ConfirmRequest | null = null;
const confirmListeners = new Set<(r: ConfirmRequest | null) => void>();

function emitConfirm() {
  for (const fn of confirmListeners) fn(pendingConfirm);
}

export function confirmAction(opts: {
  title: string;
  body?: string;
  confirmLabel?: string;
  destructive?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    pendingConfirm = { ...opts, resolve };
    emitConfirm();
  });
}

export function ConfirmHost() {
  const [req, setReq] = useState<ConfirmRequest | null>(null);
  useEffect(() => {
    const fn = (r: ConfirmRequest | null) => setReq(r);
    confirmListeners.add(fn);
    fn(pendingConfirm);
    return () => {
      confirmListeners.delete(fn);
    };
  }, []);
  if (!req) return null;

  const resolve = (ok: boolean) => {
    pendingConfirm = null;
    req.resolve(ok);
    emitConfirm();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
      onClick={() => resolve(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") resolve(false);
        if (e.key === "Enter") resolve(true);
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="document"
        className="border rounded p-6 max-w-md mx-4 w-full"
        style={{ borderColor: "#3d3838", backgroundColor: "#1b1818" }}
      >
        <h3
          className="text-[18px] font-bold mb-2"
          style={{ color: "#f2eded" }}
        >
          {req.title}
        </h3>
        {req.body && (
          <p style={{ color: "#b8b2b2" }} className="text-sm mb-6 leading-[20px]">
            {req.body}
          </p>
        )}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => resolve(false)}
            className="rounded px-4 py-2 border text-sm transition-colors"
            style={{ borderColor: "#3d3838", color: "#b8b2b2" }}
          >
            cancel
          </button>
          <button
            type="button"
            onClick={() => resolve(true)}
            autoFocus
            className="rounded px-4 py-2 font-medium text-sm transition-opacity hover:opacity-90"
            style={{
              backgroundColor: req.destructive
                ? "oklch(0.577 0.245 27.325)"
                : "#f2eded",
              color: req.destructive ? "#f2eded" : "#131010",
            }}
          >
            {req.confirmLabel ?? (req.destructive ? "delete" : "confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DeleteIconButton — small trash-like action button. Stops event propagation
// so it can live inside a clickable row without triggering the row's nav.
// ---------------------------------------------------------------------------

export function DeleteIconButton({
  onClick,
  label = "delete",
  title,
}: {
  onClick: () => void;
  label?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className="rounded px-3 py-1 text-xs border transition-colors"
      style={{ borderColor: "#3d3838", color: "#7f7a7a" }}
    >
      × {label}
    </button>
  );
}
