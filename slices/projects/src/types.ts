import { z } from 'zod';

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(100),
  createdAt: z.date(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectInputSchema = z.object({
  name: z.string().min(1).max(100),
});
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;

// Handle = safe-to-return view of an API key (no plaintext, no hash).
export const ApiKeyHandleSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  prefix: z.string(),
  scopeSheetIds: z.array(z.string().uuid()).nullable(),
  lastUsedAt: z.date().nullable(),
  createdAt: z.date(),
});
export type ApiKeyHandle = z.infer<typeof ApiKeyHandleSchema>;

// Plaintext key is returned exactly once at creation time — never stored, never
// returned again. Callers must surface it to the user immediately.
export interface NewApiKeyResult {
  handle: ApiKeyHandle;
  plaintextKey: string;
}

export interface ResolvedApiKey {
  apiKeyId: string;
  projectId: string;
  scopeSheetIds: string[] | null;
}
