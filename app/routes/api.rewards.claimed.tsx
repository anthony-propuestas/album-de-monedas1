import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { createAuth } from "~/lib/auth.server";

export async function loader() {
  return new Response(null, { status: 405 });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  const user = await authenticator.isAuthenticated(request);
  if (!user) return json({ error: "No autenticado" }, { status: 401 });

  const { coinId, txHash } = await request.json<{ coinId: string; txHash: string }>();
  if (!coinId || !txHash) return json({ error: "Parámetros requeridos." }, { status: 400 });

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(coinId)) return json({ error: "ID de moneda inválido" }, { status: 400 });

  const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/;
  if (!TX_HASH_REGEX.test(txHash)) {
    return json({ error: "Hash de transacción inválido" }, { status: 400 });
  }

  const db = context.cloudflare.env.DB;
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      "UPDATE claim_requests SET status = 'claimed', tx_hash = ?, claimed_at = ? WHERE coin_id = ? AND user_id = ? AND status = 'approved'"
    )
    .bind(txHash, now, coinId, user.id)
    .run();

  return json({ ok: true });
}
