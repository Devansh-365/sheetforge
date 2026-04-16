import { z } from 'zod';

export const ApiEnvSchema = z.object({
  PORT: z.coerce.number().int().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().min(1),
  GOOGLE_OAUTH_CLIENT_ID: z.string().min(1),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1),
  GOOGLE_OAUTH_REDIRECT_URL: z.string().url(),
  SESSION_JWT_SECRET: z.string().min(32),
  PUBLIC_BASE_URL: z.string().url(),
  WEB_BASE_URL: z.string().url(),
  PROCESSOR_ENABLED: z
    .union([z.literal('true'), z.literal('false')])
    .default('true')
    .transform((v) => v === 'true'),
  PROCESSOR_TICK_MS: z.coerce.number().int().positive().default(1000),
});

export type ApiEnv = z.infer<typeof ApiEnvSchema>;

export function loadEnv(): ApiEnv {
  const parsed = ApiEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(
      'Invalid environment — fix these:\n' +
        JSON.stringify(parsed.error.flatten().fieldErrors, null, 2),
    );
    process.exit(1);
  }
  return parsed.data;
}
