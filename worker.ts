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
    try {
      const assetResponse = await env.ASSETS.fetch(request.clone());
      if (assetResponse.status !== 404) return assetResponse;
    } catch {}
    return handler(request, { cloudflare: { env, ctx } });
  },
};
