'use client';

import {
  ApiError,
  type HammerStatus,
  type HammerWrite,
  getHammerStatus,
  hammerRun,
} from '@/lib/api-client';
import { useCallback, useEffect, useRef, useState } from 'react';

const TOTAL = 50;

type Phase = 'idle' | 'dispatching' | 'watching' | 'done' | 'error';

export function HammerDemo() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [runId, setRunId] = useState<string | null>(null);
  const [_dispatchedAt, setDispatchedAt] = useState<number | null>(null);
  const [dispatchMs, setDispatchMs] = useState<number | null>(null);
  const [status, setStatus] = useState<HammerStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const start = useCallback(async () => {
    setError(null);
    setStatus(null);
    setRunId(null);
    setDispatchMs(null);
    setPhase('dispatching');
    const t0 = performance.now();
    try {
      const result = await hammerRun(TOTAL);
      const t1 = performance.now();
      setRunId(result.runId);
      setDispatchedAt(Date.parse(result.dispatchedAt));
      setDispatchMs(Math.round(t1 - t0));
      setPhase('watching');
    } catch (err) {
      setPhase('error');
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('request failed');
      }
    }
  }, []);

  useEffect(() => {
    if (phase !== 'watching' || !runId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const next = await getHammerStatus(runId);
        if (cancelled) return;
        setStatus(next);
        if (next.done) {
          stopPolling();
          setPhase('done');
        }
      } catch {
        // Swallow transient polling errors; next tick retries.
      }
    };
    poll();
    pollRef.current = setInterval(poll, 150);
    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [phase, runId, stopPolling]);

  const tiles = buildTiles(status?.writes ?? []);
  const completedCount = tiles.filter((t) => t.kind === 'filled').length;
  const spread = spreadMs(status?.writes ?? []);

  return (
    <section className="px-[80px] py-[64px] border-b" style={{ borderColor: '#3d3838' }}>
      <h3 className="text-[16px] font-bold text-[#f2eded] mb-3">
        See it for yourself — hammer the queue
      </h3>
      <p className="text-[#b8b2b2] mb-4 leading-[24px]">
        <span style={{ color: '#22c55e' }}>[*]</span> Click the button. It fires{' '}
        {TOTAL} parallel writes at a synthetic sheet through the real pipeline —
        same advisory lock, same Redis stream, same ledger. Watch them land in
        order.
      </p>
      <p
        className="mb-6 text-sm leading-[20px] border rounded px-3 py-2 inline-flex items-center gap-2"
        style={{
          color: '#86efac',
          borderColor: '#14532d',
          backgroundColor: '#0f1a12',
        }}
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: '#22c55e' }}
          aria-hidden="true"
        />
        Self-host note: the demo talks to your local API on{' '}
        <code style={{ color: '#bbf7d0' }}>:3001</code>. Run{' '}
        <code style={{ color: '#bbf7d0' }}>pnpm dev</code> first — a hosted demo
        is on the way.
      </p>

      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={start}
          disabled={phase === 'dispatching' || phase === 'watching'}
          className="rounded px-6 py-2 font-medium transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
          style={{ backgroundColor: '#22c55e', color: '#0c0c0e' }}
        >
          {phase === 'dispatching'
            ? 'dispatching…'
            : phase === 'watching'
              ? 'watching…'
              : phase === 'done'
                ? `run again (${TOTAL} writes)`
                : `fire ${TOTAL} parallel writes`}
        </button>
        {dispatchMs !== null && (
          <span className="text-xs text-[#7f7a7a]">
            dispatched {TOTAL} writes in {dispatchMs}ms
          </span>
        )}
      </div>

      {error && (
        <p className="text-sm mb-4" style={{ color: '#f87171' }}>
          [!] {error}
        </p>
      )}

      <div
        className="border rounded p-4"
        style={{ borderColor: '#3d3838', backgroundColor: '#131010' }}
      >
        <div className="grid grid-cols-10 gap-1">
          {tiles.map((tile, i) => (
            <div
              key={i}
              className="aspect-square border rounded flex items-center justify-center text-[10px] font-mono transition-colors"
              style={{
                borderColor: tile.kind === 'filled' ? '#22c55e' : '#2a2626',
                backgroundColor: tile.kind === 'filled' ? '#14532d' : '#131010',
                color: tile.kind === 'filled' ? '#bbf7d0' : '#4a4545',
              }}
              title={
                tile.kind === 'filled'
                  ? `#${tile.arrival} · ordinal ${tile.ordinal} · ${tile.writeId.slice(0, 8)}`
                  : 'pending'
              }
            >
              {tile.kind === 'filled' ? tile.arrival : '·'}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-4 text-xs text-[#7f7a7a]">
          <span>
            {completedCount}/{TOTAL} writes landed
            {spread !== null && <> · serialized over {spread}ms · zero collisions</>}
          </span>
          {runId && (
            <span>
              run <code className="text-[#b8b2b2]">{runId.slice(0, 8)}</code>
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-[#7f7a7a] mt-3 leading-[18px]">
        Numbers are the arrival order. Dispatched in parallel, processed one at a time per sheet —
        that's the whole product.
      </p>
    </section>
  );
}

interface Tile {
  kind: 'empty' | 'filled';
  arrival: number;
  ordinal: number;
  writeId: string;
}

function buildTiles(writes: HammerWrite[]): Tile[] {
  const tiles: Tile[] = Array.from({ length: TOTAL }, () => ({
    kind: 'empty',
    arrival: 0,
    ordinal: 0,
    writeId: '',
  }));
  const completed = writes.filter((w) => w.completedAt !== null);
  completed.forEach((w, i) => {
    if (i < TOTAL) {
      tiles[i] = {
        kind: 'filled',
        arrival: i + 1,
        ordinal: w.ordinal,
        writeId: w.writeId,
      };
    }
  });
  return tiles;
}

function spreadMs(writes: HammerWrite[]): number | null {
  const completed = writes
    .filter((w) => w.completedAt !== null)
    .map((w) => Date.parse(w.completedAt as string));
  if (completed.length < 2) return null;
  return Math.max(...completed) - Math.min(...completed);
}
