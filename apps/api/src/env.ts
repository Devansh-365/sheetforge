import { z } from 'zod';

export const ApiEnvSchema = z
  .object({
    PORT: z.coerce.number().int().default(3001),
    DATABASE_URL: z.string().url(),
    // One of the Redis bindings must be present; validated in the refinement
    // below. Upstash REST takes precedence when both are set.
    REDIS_URL: z.string().min(1).optional(),
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
    GOOGLE_OAUTH_CLIENT_ID: z.string().min(1),
    GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1),
    GOOGLE_OAUTH_REDIRECT_URL: z.string().url(),
    SESSION_JWT_SECRET: z.string().min(32),
    PUBLIC_BASE_URL: z.string().url().default('http://localhost:3001'),
    // Single canonical URL for the OAuth post-login redirect.
    WEB_BASE_URL: z.string().url().default('http://localhost:3000'),
    // Optional comma-separated list of additional origins allowed by CORS.
    // Use this for Vercel preview deploys, www-vs-apex, etc. WEB_BASE_URL is
    // always allowed automatically; this only adds extras.
    ALLOWED_WEB_ORIGINS: z.string().optional(),
    PROCESSOR_ENABLED: z
      .union([z.literal('true'), z.literal('false')])
      .default('true')
      .transform((v) => v === 'true'),
    PROCESSOR_TICK_MS: z.coerce.number().int().positive().default(1000),
  })
  .refine(
    (v) =>
      (v.UPSTASH_REDIS_REST_URL && v.UPSTASH_REDIS_REST_TOKEN) ||
      (v.REDIS_URL && v.REDIS_URL.length > 0),
    {
      message:
        'Redis not configured — set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN, or REDIS_URL',
      path: ['REDIS_URL'],
    },
  );

export type ApiEnv = z.infer<typeof ApiEnvSchema>;

export function loadEnv(): ApiEnv {
  const parsed = ApiEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(
      `Invalid environment — fix these:\n${JSON.stringify(parsed.error.flatten().fieldErrors, null, 2)}`,
    );
    process.exit(1);
  }
  return parsed.data;
}
