import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { createAuth } from "~/lib/auth.server";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  const user = await authenticator.isAuthenticated(request);
  if (!user) throw redirect("/");

  const coinId = params.coinId;
  const db = context.cloudflare.env.DB;

  const claim = await db
    .prepare(
      "SELECT status, reject_reason, expires_at, coin_id_hash FROM claim_requests WHERE coin_id = ? ORDER BY created_at DESC LIMIT 1"
    )
    .bind(coinId)
    .first<{ status: string; reject_reason: string | null; expires_at: number | null; coin_id_hash: string }>();

  if (!claim) return json({ status: "eligible" });

  if (claim.status === "approved") {
    return json({
      status: claim.status,
      expiresAt: claim.expires_at,
      coinIdHash: claim.coin_id_hash,
    });
  }

  return json({
    status: claim.status,
    rejectReason: claim.reject_reason ?? undefined,
  });
}
