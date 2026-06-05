import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { createAuth } from "~/lib/auth.server";
import { getCoinIdHash, isCoinClaimedOnchain } from "~/lib/rewards.server";
import { COINS_BY_COUNTRY } from "~/lib/coins";

export async function loader() {
  return json({ error: "Method not allowed" }, { status: 405 });
}

export async function action({ request, context }: ActionFunctionArgs) {
  try {
    const { authenticator } = createAuth(context.cloudflare.env);
    const user = await authenticator.isAuthenticated(request);
    if (!user) return json({ error: "No autenticado" }, { status: 401 });

    const body = await request.json<{ coinId?: string; walletAddress?: string }>();
    const { coinId, walletAddress } = body;
    if (!coinId || !walletAddress) return json({ error: "Parámetros requeridos" }, { status: 400 });

    const db = context.cloudflare.env.DB;

    const coin = await db
      .prepare(
        "SELECT id, user_id, country, denomination, name, year, registry_match FROM coins WHERE id = ? AND user_id = ?"
      )
      .bind(coinId, user.id)
      .first<{ id: string; user_id: string; country: string; denomination: string; name: string; year: number; registry_match: number }>();

    if (!coin) return json({ error: "Moneda no encontrada" }, { status: 404 });

    const catalog = coin.country ? COINS_BY_COUNTRY[coin.country] : null;
    const isVerified = catalog?.some(
      (e) => e.denominacion === coin.denomination && e.nombre === coin.name && e.anio === coin.year
    ) ?? false;
    if (!isVerified) return json({ error: "Esta moneda no está verificada en el registro" }, { status: 400 });

    const existing = await db
      .prepare("SELECT id FROM claim_requests WHERE coin_id = ? AND status IN ('pending', 'approved')")
      .bind(coinId)
      .first<{ id: string }>();
    if (existing) return json({ error: "Ya existe una solicitud activa para esta moneda" }, { status: 409 });

    const coinIdHash = getCoinIdHash(coin.country, coin.denomination, coin.name, coin.year);

    const claimed = await isCoinClaimedOnchain(coinIdHash);
    if (claimed) return json({ error: "Esta moneda ya fue reclamada onchain" }, { status: 409 });

    const claimRequestId = crypto.randomUUID();
    const coinRegistryKey = `${coin.country}|${coin.denomination}|${coin.name}|${coin.year}`;
    const now = Math.floor(Date.now() / 1000);

    await db
      .prepare(
        `INSERT INTO claim_requests (id, user_id, coin_id, coin_registry_key, coin_id_hash, wallet_address, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`
      )
      .bind(claimRequestId, user.id, coinId, coinRegistryKey, coinIdHash, walletAddress.toLowerCase(), now)
      .run();

    return json({ claimRequestId, status: "pending" });
  } catch (e) {
    console.error("[rewards/request]", e);
    return json({ error: String(e) }, { status: 500 });
  }
}
