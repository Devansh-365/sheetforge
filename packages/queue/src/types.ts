// Minimal Redis surface the queue needs. Both @upstash/redis (HTTP, works on
// Cloudflare Workers) and ioredis (TCP, Node workers) can implement this
// through a thin adapter — the queue itself does not depend on either library.

export interface QueueRedisClient {
  /** XADD key * field1 val1 field2 val2 … — returns the new message id. */
  xadd(key: string, fields: Record<string, string>): Promise<string>;

  /**
   * XREADGROUP GROUP group consumer COUNT 1 BLOCK blockMs STREAMS key `>`.
   * Returns the next pending-for-this-consumer message, or null if none
   * arrived within blockMs.
   */
  xreadgroupSingle(args: {
    group: string;
    consumer: string;
    key: string;
    blockMs?: number;
  }): Promise<{ id: string; fields: Record<string, string> } | null>;

  /** XACK key group messageId. */
  xack(key: string, group: string, messageId: string): Promise<void>;

  /**
   * XGROUP CREATE key group $ MKSTREAM.
   * Must be idempotent — implementations should swallow BUSYGROUP.
   */
  xgroupCreateMkstream(key: string, group: string): Promise<void>;

  /** XTRIM key MAXLEN ~ N — approximate trim for backlog control. */
  xtrimMaxlenApprox(key: string, maxLen: number): Promise<void>;

  /**
   * SET key value NX PX ttlMs — returns true if the key was set (i.e., did not
   * already exist). Used for idempotency-key dedupe locks.
   */
  setNxPx(key: string, value: string, ttlMs: number): Promise<boolean>;

  /** GET key. */
  get(key: string): Promise<string | null>;
}

export interface EnqueueMessage<P> {
  writeId: string;
  idempotencyKey?: string;
  payload: P;
}

export interface ClaimedMessage<P> {
  /** Redis stream message id — pass to `xack` when processing is durable. */
  messageId: string;
  writeId: string;
  idempotencyKey?: string;
  payload: P;
  enqueuedAt: string;
}
