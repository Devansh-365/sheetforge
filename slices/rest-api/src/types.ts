import type { QueueRedisClient } from '@acid-sheets/queue';
import type { Db } from '@acid-sheets/shared-db';

export interface RouterEnv {
  GOOGLE_OAUTH_CLIENT_ID: string;
  GOOGLE_OAUTH_CLIENT_SECRET: string;
  GOOGLE_OAUTH_REDIRECT_URL: string;
  SESSION_JWT_SECRET: string;
  PUBLIC_BASE_URL: string;
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
