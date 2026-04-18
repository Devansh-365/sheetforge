import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './migrations',
  // Connection string only needed for push/pull commands, not for `generate`.
  // Set DATABASE_URL when running migrate against a real Postgres instance.
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://localhost:5432/acid_sheets',
  },
});
