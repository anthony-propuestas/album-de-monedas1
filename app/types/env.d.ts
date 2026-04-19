export interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  SESSION_SECRET: string;
}

declare module "@remix-run/server-runtime" {
  interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: {
        waitUntil(promise: Promise<unknown>): void;
        passThroughOnException(): void;
      };
      cf: Record<string, unknown>;
      caches: CacheStorage;
    };
  }
}
