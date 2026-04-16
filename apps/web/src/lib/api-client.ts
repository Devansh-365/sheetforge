const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API ${status}`);
    this.name = 'ApiError';
  }
}

export async function api<T = unknown>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
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
    throw new ApiError(res.status, body);
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
export const listProjects = () =>
  api<{ projects: Project[] }>('/v1/projects');
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
  api<{ handle: ApiKeyHandle; plaintextKey: string }>(
    `/v1/projects/${projectId}/api-keys`,
    { method: 'POST', body: JSON.stringify({}) },
  );

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
export const connectSheet = (
  projectId: string,
  googleSheetId: string,
  tabName: string,
) =>
  api<{ sheet: SheetRecord; schema: SchemaSnapshot }>(
    `/v1/projects/${projectId}/sheets`,
    {
      method: 'POST',
      body: JSON.stringify({ googleSheetId, tabName }),
    },
  );
export const getSchema = (projectId: string, sheetId: string) =>
  api<{ schema: SchemaSnapshot }>(
    `/v1/projects/${projectId}/sheets/${sheetId}/schema`,
  );
export const refreshSchema = (projectId: string, sheetId: string) =>
  api<{ schema: SchemaSnapshot }>(
    `/v1/projects/${projectId}/sheets/${sheetId}/schema/refresh`,
    { method: 'POST', body: JSON.stringify({}) },
  );
