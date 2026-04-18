import type { QueueRedisClient } from '@sheetforge/queue';
import type { Db } from '@sheetforge/shared-db';

export interface RouterEnv {
  GOOGLE_OAUTH_CLIENT_ID: string;
  GOOGLE_OAUTH_CLIENT_SECRET: string;
  GOOGLE_OAUTH_REDIRECT_URL: string;
  SESSION_JWT_SECRET: string;
  /** API base — where the SDK generator points clients. */
  PUBLIC_BASE_URL: string;
  /** Browser app origin — used for the post-OAuth redirect target. */
  WEB_BASE_URL: string;
  /** Optional CSV of additional origins permitted by the dashboard CORS check. */
  ALLOWED_WEB_ORIGINS?: string;
}

export interface RouterDeps {
  db: Db;
  redis: QueueRedisClient;
  env: RouterEnv;
}

export interface AppVariables {
  user: { userId: string; email: string };
  apiKey: {
    apiKeyId: string;
    projectId: string;
    scopeSheetIds: string[] | null;
  };
}
