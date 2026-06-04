import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { createAuth } from "~/lib/auth.server";
import { signClaim, isCoinClaimedOnchain } from "~/lib/rewards.server";

export async function loader() {
  return json({ error: "Method not allowed" }, { status: 405 });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  const user = await authenticator.isAuthenticated(request);
  if (!user) return json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json<{ coinId?: string; walletAddress?: string }>();
  const { coinId, walletAddress } = body;
  if (!coinId || !walletAddress) return json({ error: "Parámetros requeridos" }, { status: 400 });

  const db = context.cloudflare.env.DB;

  const claim = await db
    .prepare(
      "SELECT id, expires_at, coin_id_hash, wallet_address FROM claim_requests WHERE coin_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 1"
    )
    .bind(coinId)
    .first<{ id: string; expires_at: number; coin_id_hash: string; wallet_address: string }>();

  if (!claim) return json({ error: "No hay solicitud aprobada para esta moneda" }, { status: 404 });

  const now = Math.floor(Date.now() / 1000);
  if (claim.expires_at < now) return json({ error: "La solicitud expiró" }, { status: 410 });
  if (claim.wallet_address !== walletAddress.toLowerCase()) return json({ error: "Wallet no coincide" }, { status: 403 });

  const coinIdHash = claim.coin_id_hash as `0x${string}`;
  const claimed = await isCoinClaimedOnchain(coinIdHash);
  if (claimed) return json({ error: "Esta moneda ya fue reclamada onchain" }, { status: 409 });

  const signature = await signClaim(walletAddress as `0x${string}`, coinIdHash, context.cloudflare.env);

  return json({ signature, coinIdHash });
}
