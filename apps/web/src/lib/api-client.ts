const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function extractMessage(body: unknown): string | null {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const err = (body as { error: unknown }).error;
    if (typeof err === 'object' && err !== null && 'message' in err) {
      const msg = (err as { message: unknown }).message;
      if (typeof msg === 'string' && msg.length > 0) return msg;
    }
  }
  return null;
}

function extractCode(body: unknown): string | null {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const err = (body as { error: unknown }).error;
    if (typeof err === 'object' && err !== null && 'code' in err) {
      const code = (err as { code: unknown }).code;
      if (typeof code === 'string') return code;
    }
  }
  return null;
}

export class ApiError extends Error {
  readonly code: string | null;

  constructor(
    public status: number,
    public body: unknown,
  ) {
    const msg = extractMessage(body);
    super(msg ? `${msg} (API ${status})` : `API ${status}`);
    this.name = 'ApiError';
    this.code = extractCode(body);
  }
}

/**
 * Dashboard-wide auth auto-redirect. A 401 with GOOGLE_RECONNECT_REQUIRED
 * means the user's Google grant is gone (revoked or expired); send them to
 * /signin?reconnect=1 so we can show the right copy instead of a generic
 * sign-in page. Guarded by `typeof window !== 'undefined'` so SSR bundles
 * never trip it.
 */
function maybeAutoRedirect(err: ApiError): void {
  if (typeof window === 'undefined') return;
  if (err.status !== 401) return;
  if (err.code !== 'GOOGLE_RECONNECT_REQUIRED') return;
  if (window.location.pathname === '/signin') return;
  window.location.href = '/signin?reconnect=1';
}

export async function api<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    ...opts,
    headers: {
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...opts.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new ApiError(res.status, body);
    maybeAutoRedirect(err);
    throw err;
  }
  if (res.status === 204) return undefined as T;
  const contentType = res.headers.get('Content-Type') ?? '';
  if (contentType.includes('text/')) {
    return (await res.text()) as T;
  }
  return (await res.json()) as T;
}

export function loginUrl(): string {
  return `${API_URL}/v1/oauth/login`;
}

export function sdkUrl(projectId: string, sheetId: string): string {
  return `${API_URL}/v1/projects/${projectId}/sheets/${sheetId}/sdk.ts`;
}

// ---------------------------------------------------------------------------
// Typed endpoint wrappers
// ---------------------------------------------------------------------------

export interface Me {
  user: { userId: string; email: string };
}
export const getMe = () => api<Me>('/v1/me');

export interface Project {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
}
export const listProjects = () => api<{ projects: Project[] }>('/v1/projects');
export const createProject = (name: string) =>
  api<{ project: Project }>('/v1/projects', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

export interface ApiKeyHandle {
  id: string;
  projectId: string;
  prefix: string;
  scopeSheetIds: string[] | null;
  lastUsedAt: string | null;
  createdAt: string;
}
export const listApiKeys = (projectId: string) =>
  api<{ apiKeys: ApiKeyHandle[] }>(`/v1/projects/${projectId}/api-keys`);
export const createApiKey = (projectId: string) =>
  api<{ handle: ApiKeyHandle; plaintextKey: string }>(`/v1/projects/${projectId}/api-keys`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

export interface SheetRecord {
  id: string;
  projectId: string;
  googleSheetId: string;
  tabName: string;
  schemaSnapshotId: string | null;
  createdAt: string;
}
export interface SchemaSnapshot {
  id: string;
  sheetId: string;
  columns: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'datetime';
    nullable: boolean;
  }[];
  version: number;
  generatedAt: string;
}
export const listSheets = (projectId: string) =>
  api<{ sheets: SheetRecord[] }>(`/v1/projects/${projectId}/sheets`);
export const connectSheet = (projectId: string, googleSheetId: string, tabName: string) =>
  api<{ sheet: SheetRecord; schema: SchemaSnapshot }>(`/v1/projects/${projectId}/sheets`, {
    method: 'POST',
    body: JSON.stringify({ googleSheetId, tabName }),
  });
export const getSchema = (projectId: string, sheetId: string) =>
  api<{ schema: SchemaSnapshot }>(`/v1/projects/${projectId}/sheets/${sheetId}/schema`);
export const refreshSchema = (projectId: string, sheetId: string) =>
  api<{ schema: SchemaSnapshot }>(`/v1/projects/${projectId}/sheets/${sheetId}/schema/refresh`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

export interface PreviewResult {
  rows: Array<Record<string, unknown>>;
  columns: SchemaSnapshot['columns'];
}
export const previewSheet = (projectId: string, sheetId: string, limit = 10) =>
  api<PreviewResult>(`/v1/projects/${projectId}/sheets/${sheetId}/preview?limit=${limit}`);

export type WriteLedgerStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'dead_lettered';

export interface LedgerRow {
  id: string;
  sheetId: string;
  writeId: string;
  idempotencyKey: string | null;
  status: WriteLedgerStatus;
  enqueuedAt: string;
  completedAt: string | null;
}

export interface LedgerStats {
  stats: Record<WriteLedgerStatus, number>;
  recent: LedgerRow[];
}

export const getLedgerStats = (projectId: string, sheetId: string) =>
  api<LedgerStats>(`/v1/projects/${projectId}/sheets/${sheetId}/ledger-stats`);

export interface TestWriteResult {
  writeId: string;
  status: 'enqueued' | 'replayed';
  messageId?: string;
  submittedRow: Record<string, unknown>;
}

export const testWrite = (projectId: string, sheetId: string) =>
  api<TestWriteResult>(`/v1/projects/${projectId}/sheets/${sheetId}/test-write`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

// ---------------------------------------------------------------------------
// Public hammer demo (anonymous, rate-limited)
// ---------------------------------------------------------------------------

export interface HammerRunResult {
  runId: string;
  n: number;
  dispatchedAt: string;
}

export interface HammerWrite {
  writeId: string;
  ordinal: number;
  idempotencyKey: string;
  enqueuedAt: string;
  completedAt: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead_lettered';
}

export interface HammerStatus {
  runId: string;
  writes: HammerWrite[];
  done: boolean;
}

export const hammerRun = (n: number) =>
  api<HammerRunResult>('/v1/demo/hammer', {
    method: 'POST',
    body: JSON.stringify({ n }),
  });

export const getHammerStatus = (runId: string) => api<HammerStatus>(`/v1/demo/hammer/${runId}`);

export const logout = () =>
  api<{ ok: true }>('/v1/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  });

// ---------------------------------------------------------------------------
// Delete / revoke / disconnect
// ---------------------------------------------------------------------------

export const deleteProject = (projectId: string) =>
  api<undefined>(`/v1/projects/${projectId}`, { method: 'DELETE' });

export const revokeApiKey = (projectId: string, apiKeyId: string) =>
  api<undefined>(`/v1/projects/${projectId}/api-keys/${apiKeyId}`, {
    method: 'DELETE',
  });

export const disconnectSheet = (projectId: string, sheetId: string) =>
  api<undefined>(`/v1/projects/${projectId}/sheets/${sheetId}`, {
    method: 'DELETE',
  });
