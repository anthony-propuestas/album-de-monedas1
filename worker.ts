import { createRequestHandler } from "@remix-run/cloudflare";
import * as build from "./build/server/index.js";

const handler = createRequestHandler(build);

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: R2Bucket;
  [key: string]: unknown;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const isAsset = url.pathname.startsWith("/assets/") || url.pathname.startsWith("/favicon");

    if (isAsset) {
      if (!env.ASSETS) {
        return new Response("ASSETS binding unavailable", { status: 503 });
      }
      return env.ASSETS.fetch(new Request(request.url));
    }

    try {
      const assetResponse = await env.ASSETS.fetch(request.clone());
      if (assetResponse.ok) return assetResponse;
    } catch {}
    return handler(request, { cloudflare: { env, ctx } });
  },
};
