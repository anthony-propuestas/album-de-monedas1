import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { createAuth } from "~/lib/auth.server";
import { signClaim } from "~/lib/rewards.server";
import { checkRateLimit } from "~/lib/rateLimit.server";

export async function loader() {
  return json({ error: "Method not allowed" }, { status: 405 });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  const user = await authenticator.isAuthenticated(request);
  if (!user) return json({ error: "No autenticado" }, { status: 401 });

  const db = context.cloudflare.env.DB;
  const rl = await checkRateLimit(db, user.id, "rewards_sign", 5, 1);
  if (!rl.allowed) return json({ error: "Demasiadas solicitudes" }, { status: 429 });

  const body = await request.json<{ coinId?: string; walletAddress?: string }>();
  const { coinId, walletAddress } = body;
  if (!coinId || !walletAddress) return json({ error: "Parámetros requeridos" }, { status: 400 });

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(coinId)) return json({ error: "ID de moneda inválido" }, { status: 400 });

  const claim = await db
    .prepare(
      "SELECT id, expires_at, coin_id_hash, wallet_address FROM claim_requests WHERE coin_id = ? AND user_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 1"
    )
    .bind(coinId, user.id)
    .first<{ id: string; expires_at: number; coin_id_hash: string; wallet_address: string }>();

  if (!claim) return json({ error: "No hay solicitud aprobada para esta moneda" }, { status: 404 });

  const now = Math.floor(Date.now() / 1000);
  if (claim.expires_at < now) return json({ error: "La solicitud expiró" }, { status: 410 });
  if (claim.wallet_address !== walletAddress.toLowerCase()) return json({ error: "Wallet no coincide" }, { status: 403 });

  if (!context.cloudflare.env.BACKEND_SIGNER_KEY) {
    return json({ error: "Servidor no configurado" }, { status: 500 });
  }

  const coinIdHash = claim.coin_id_hash as `0x${string}`;

  try {
    const { signature, signerAddress, signedWallet } = await signClaim(walletAddress as `0x${string}`, coinIdHash, context.cloudflare.env);
    return json({ signature, coinIdHash, signerAddress, signedWallet });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al firmar";
    return json({ error: msg }, { status: 500 });
  }
}
