import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { useLoaderData, useNavigation, useFetcher } from "@remix-run/react";
import { useState } from "react";
import { AddCoinModal } from "~/components/AddCoinModal";
import { EditCoinModal } from "~/components/EditCoinModal";
import { CoinCard } from "~/components/CoinCard";
import { CoinDetailModal } from "~/components/CoinDetailModal";
import { DeleteConfirmModal } from "~/components/DeleteConfirmModal";
import { CoinFilters } from "~/components/CoinFilters";
import { ClaimButton } from "~/components/ClaimButton";
import { WalletConnectButton } from "~/components/WalletConnectButton";
import { SeriesProgress } from "~/components/SeriesProgress";
import { YearTimeline } from "~/components/YearTimeline";
import { WorldMap } from "~/components/WorldMap";
import { createAuth } from "~/lib/auth.server";
import { COINS_BY_COUNTRY } from "~/lib/coins";
import { checkRateLimit } from "~/lib/rateLimit.server";
import { NUMERIC_TO_ALPHA2 } from "~/lib/country-numeric-map";
import type { Coin } from "~/components/CoinCard";

const VALID_COUNTRIES = new Set(Object.values(NUMERIC_TO_ALPHA2));

export const meta: MetaFunction = () => [
  { title: "Mi Colección — Album de Monedas" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  const user = await authenticator.isAuthenticated(request);
  if (!user) throw redirect("/");

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const country = url.searchParams.get("country") ?? "";
  const year = url.searchParams.get("year") ?? "";
  const condition = url.searchParams.get("condition") ?? "";

  const db = context.cloudflare.env.DB;

  let query = "SELECT * FROM coins WHERE user_id = ?";
  const values: (string | number)[] = [user.id];

  if (q) {
    query += " AND name LIKE ?";
    values.push(`%${q}%`);
  }
  if (country) {
    query += " AND country = ?";
    values.push(country);
  }
  if (year) {
    query += " AND year = ?";
    values.push(parseInt(year, 10));
  }
  if (condition) {
    query += " AND condition = ?";
    values.push(condition);
  }

  query += " ORDER BY created_at DESC";

  try {
    const { results: coins } = await db
      .prepare(query)
      .bind(...values)
      .all<Coin>();

    const { results: allCoins } = await db
      .prepare("SELECT name, country, year, denomination FROM coins WHERE user_id = ?")
      .bind(user.id)
      .all<{ name: string; country: string | null; year: number | null; denomination: string | null }>();

    const seriesProgressByCountry: Record<string, { serie: string; total: number; owned: number; pct: number }[]> = {};
    for (const countryCode of Object.keys(COINS_BY_COUNTRY)) {
      const ownedKeys = new Set(
        allCoins.filter((c) => c.country === countryCode).map((c) => `${c.name}|${c.year}|${c.denomination}`)
      );
      const catalog = COINS_BY_COUNTRY[countryCode];
      const seriesMap = new Map<string, { total: number; owned: number }>();
      for (const entry of catalog) {
        const key = entry.serie ?? "Sin serie";
        const cur = seriesMap.get(key) ?? { total: 0, owned: 0 };
        cur.total += 1;
        if (ownedKeys.has(`${entry.nombre}|${entry.anio}|${entry.denominacion}`)) cur.owned += 1;
        seriesMap.set(key, cur);
      }
      seriesProgressByCountry[countryCode] = Array.from(seriesMap.entries()).map(
        ([serie, data]) => ({ serie, ...data, pct: Math.round((data.owned / data.total) * 100) })
      );
    }

    const { results: claimRows } = await db
      .prepare(
        "SELECT coin_id, status, reject_reason, expires_at, coin_id_hash FROM claim_requests WHERE user_id = ? ORDER BY created_at DESC"
      )
      .bind(user.id)
      .all<{ coin_id: string; status: string; reject_reason: string | null; expires_at: number | null; coin_id_hash: string }>();

    const claimStatuses: Record<string, typeof claimRows[number]> = {};
    for (const row of claimRows) {
      if (!claimStatuses[row.coin_id]) claimStatuses[row.coin_id] = row;
    }

    const coinsWithMatch = coins.map((coin) => {
      const catalog = coin.country ? COINS_BY_COUNTRY[coin.country] : null;
      if (!catalog || coin.year == null || !coin.denomination) return coin;
      const match = catalog.some(
        (e) => e.denominacion === coin.denomination && e.nombre === coin.name && e.anio === coin.year
      );
      return { ...coin, registry_match: match ? 1 : 0 };
    });

    return json({ user, coins: coinsWithMatch, filters: { q, country, year, condition }, seriesProgressByCountry, allCoins, claimStatuses });
  } catch (e) {
    throw new Response("Error al cargar la colección", { status: 500 });
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  const user = await authenticator.isAuthenticated(request);
  if (!user) throw redirect("/");

  const form = await request.formData();
  const intent = form.get("intent")?.toString();

  const db = context.cloudflare.env.DB;

  if (intent === "list_coin") {
    const listId = form.get("coin_id")?.toString();
    const askingRaw = form.get("asking_price")?.toString();
    const askingPrice = askingRaw ? parseFloat(askingRaw) : null;
    if (!listId) return json({ error: "ID requerido." }, { status: 400 });
    if (askingPrice !== null && (isNaN(askingPrice) || askingPrice < 0)) {
      return json({ error: "Precio inválido." }, { status: 400 });
    }
    const rl = await checkRateLimit(db, user.id, "list_coin", 40, 24);
    if (!rl.allowed) {
      return json({ error: `Límite de publicaciones alcanzado. Podés volver a intentar en ${Math.ceil(rl.retryAfterSeconds / 60)} minutos.` }, { status: 429 });
    }
    try {
      const owned = await db
        .prepare("SELECT id FROM coins WHERE id = ? AND user_id = ?")
        .bind(listId, user.id)
        .first<{ id: string }>();
      if (!owned) return json({ error: "Moneda no encontrada." }, { status: 404 });
      await db
        .prepare("UPDATE coins SET for_sale = 1, asking_price = ? WHERE id = ? AND user_id = ?")
        .bind(askingPrice, listId, user.id)
        .run();
    } catch (e) {
      return json({ error: "Error al publicar la moneda." }, { status: 500 });
    }
    return json({ success: true });
  }

  if (intent === "unlist_coin") {
    const listId = form.get("coin_id")?.toString();
    if (!listId) return json({ error: "ID requerido." }, { status: 400 });
    const rl = await checkRateLimit(db, user.id, "unlist_coin", 40, 24);
    if (!rl.allowed) {
      return json({ error: `Límite alcanzado. Podés volver a intentar en ${Math.ceil(rl.retryAfterSeconds / 60)} minutos.` }, { status: 429 });
    }
    try {
      await db
        .prepare("UPDATE coins SET for_sale = 0, asking_price = NULL WHERE id = ? AND user_id = ?")
        .bind(listId, user.id)
        .run();
    } catch (e) {
      return json({ error: "Error al quitar la moneda del mercado." }, { status: 500 });
    }
    return json({ success: true });
  }

  if (intent === "delete_coin") {
    const id = form.get("id")?.toString();
    if (!id) return json({ error: "ID requerido." }, { status: 400 });
    const rl = await checkRateLimit(db, user.id, "delete_coin", 30, 24);
    if (!rl.allowed) {
      return json({ error: `Límite de eliminaciones alcanzado. Podés volver a intentar en ${Math.ceil(rl.retryAfterSeconds / 60)} minutos.` }, { status: 429 });
    }
    const coin = await db
      .prepare("SELECT * FROM coins WHERE id = ? AND user_id = ?")
      .bind(id, user.id)
      .first<Coin>();
    if (!coin) return json({ error: "Moneda no encontrada." }, { status: 404 });
    const images = context.cloudflare.env.IMAGES as R2Bucket | undefined;
    if (images) {
      const slots = ["photo_obverse", "photo_reverse", "photo_edge", "photo_detail"] as const;
      await Promise.allSettled(
        slots.filter((s) => coin[s]).map((s) => images.delete(`${user.id}/${id}/${s}`))
      );
    }
    await db.prepare("DELETE FROM coins WHERE id = ? AND user_id = ?").bind(id, user.id).run();
    return json({ ok: true });
  }

  if (intent === "edit_coin") {
    const id = form.get("coin_id")?.toString();
    if (!id) return json({ error: "ID requerido." }, { status: 400 });

    const coin = await db
      .prepare("SELECT * FROM coins WHERE id = ? AND user_id = ?")
      .bind(id, user.id)
      .first<Coin>();
    if (!coin) return json({ error: "Moneda no encontrada." }, { status: 404 });

    const activeClaim = await db
      .prepare(
        "SELECT status FROM claim_requests WHERE coin_id = ? AND user_id = ? AND status IN ('pending','approved','claimed') LIMIT 1"
      )
      .bind(id, user.id)
      .first<{ status: string }>();
    if (activeClaim) {
      return json(
        { error: "Esta pieza está en proceso de verificación y no puede editarse." },
        { status: 403 }
      );
    }

    const rl = await checkRateLimit(db, user.id, "edit_coin", 30, 24);
    if (!rl.allowed) {
      return json({ error: `Límite de ediciones alcanzado. Reintentá en ${Math.ceil(rl.retryAfterSeconds / 60)} minutos.` }, { status: 429 });
    }

    const name = form.get("name")?.toString().trim() ?? "";
    if (!name) return json({ error: "El nombre es obligatorio." }, { status: 400 });
    const country = form.get("country")?.toString() || null;
    const yearRaw = form.get("year")?.toString();
    const year = yearRaw ? parseInt(yearRaw, 10) : null;
    const denomination = form.get("denomination")?.toString() || null;
    const condition = form.get("condition")?.toString() || null;
    const mint = form.get("mint")?.toString() || null;
    const catalogRef = form.get("catalog_ref")?.toString() || null;
    const estimatedRaw = form.get("estimated_value")?.toString();
    const estimatedValue = estimatedRaw ? parseFloat(estimatedRaw) : null;
    const notes = form.get("notes")?.toString() || null;

    if (name.length > 200 || (notes && notes.length > 1000)) {
      return json({ error: "Texto demasiado largo." }, { status: 400 });
    }
    if (mint && mint.trim().length > 200) return json({ error: "mint demasiado largo" }, { status: 400 });
    if (catalogRef && catalogRef.trim().length > 200) return json({ error: "catalog_ref demasiado largo" }, { status: 400 });

    const VALID_CONDITIONS = ["MS", "AU", "XF", "VF", "F", "VG", "G", "P"] as const;
    if (condition && !(VALID_CONDITIONS as readonly string[]).includes(condition)) {
      return json({ error: "Condición inválida." }, { status: 400 });
    }
    if (country && !VALID_COUNTRIES.has(country)) return json({ error: "País inválido" }, { status: 400 });

    const coinsForCountry = country ? COINS_BY_COUNTRY[country] : null;
    const registryMatch = coinsForCountry != null && year != null && coinsForCountry.some(
      (e) => e.denominacion === denomination && e.nombre === name && e.anio === year
    );

    const images = context.cloudflare.env.IMAGES as R2Bucket | undefined;

    const uploadOrKeep = async (slot: keyof Pick<Coin, "photo_obverse" | "photo_reverse" | "photo_edge" | "photo_detail">): Promise<string | null> => {
      const file = form.get(slot as string);
      if (!file || !(file instanceof File) || file.size === 0) return coin[slot];
      if (file.size > 5 * 1024 * 1024) return coin[slot];
      if (!images) return coin[slot];
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      if (bytes[0] !== 0xFF || bytes[1] !== 0xD8 || bytes[2] !== 0xFF) return coin[slot];
      const key = `${user.id}/${id}/${slot}`;
      if (coin[slot]) await images.delete(coin[slot] as string);
      await images.put(key, buffer, { httpMetadata: { contentType: "image/jpeg" } });
      return key;
    };

    const [photoObverse, photoReverse, photoEdge, photoDetail] = await Promise.all([
      uploadOrKeep("photo_obverse"),
      uploadOrKeep("photo_reverse"),
      uploadOrKeep("photo_edge"),
      uploadOrKeep("photo_detail"),
    ]);

    try {
      await db
        .prepare(
          `UPDATE coins SET name=?, country=?, year=?, denomination=?, condition=?, mint=?,
           catalog_ref=?, estimated_value=?, notes=?,
           photo_obverse=?, photo_reverse=?, photo_edge=?, photo_detail=?, registry_match=?
           WHERE id=? AND user_id=?`
        )
        .bind(
          name, country, year, denomination, condition, mint,
          catalogRef, estimatedValue, notes,
          photoObverse, photoReverse, photoEdge, photoDetail,
          registryMatch ? 1 : 0,
          id, user.id
        )
        .run();
    } catch (e) {
      return json({ error: "Error al guardar los cambios." }, { status: 500 });
    }

    return redirect("/mycollection");
  }

  if (intent !== "add_coin") {
    return json({ error: "Acción no reconocida." }, { status: 400 });
  }

  const coinId = crypto.randomUUID();
  const images = context.cloudflare.env.IMAGES as R2Bucket | undefined;

  const name = form.get("name")?.toString().trim() ?? "";
  if (!name) return json({ error: "El nombre es obligatorio." }, { status: 400 });
  const country = form.get("country")?.toString() || null;
  const yearRaw = form.get("year")?.toString();
  const year = yearRaw ? parseInt(yearRaw, 10) : null;
  const denomination = form.get("denomination")?.toString() || null;
  const condition = form.get("condition")?.toString() || null;
  const mint = form.get("mint")?.toString() || null;
  const catalogRef = form.get("catalog_ref")?.toString() || null;
  const estimatedRaw = form.get("estimated_value")?.toString();
  const estimatedValue = estimatedRaw ? parseFloat(estimatedRaw) : null;
  const notes = form.get("notes")?.toString() || null;

  if (name.length > 200 || (notes && notes.length > 1000)) {
    return json({ error: "Texto demasiado largo." }, { status: 400 });
  }
  if (mint && mint.trim().length > 200) return json({ error: "mint demasiado largo" }, { status: 400 });
  if (catalogRef && catalogRef.trim().length > 200) return json({ error: "catalog_ref demasiado largo" }, { status: 400 });

  const VALID_CONDITIONS = ["MS", "AU", "XF", "VF", "F", "VG", "G", "P"] as const;
  if (condition && !(VALID_CONDITIONS as readonly string[]).includes(condition)) {
    return json({ error: "Condición inválida." }, { status: 400 });
  }
  if (country && !VALID_COUNTRIES.has(country)) return json({ error: "País inválido" }, { status: 400 });

  const coinsForCountry = country ? COINS_BY_COUNTRY[country] : null;
  const registryMatch = coinsForCountry != null && year != null && coinsForCountry.some(
    (e) => e.denominacion === denomination && e.nombre === name && e.anio === year
  );
  if (coinsForCountry) {
    const validDenominations = [...new Set(coinsForCountry.map(c => c.denominacion))];
    if (denomination && !validDenominations.includes(denomination)) {
      return json({ error: "Denominación inválida." }, { status: 400 });
    }
    const validNames = coinsForCountry
      .filter(c => !denomination || c.denominacion === denomination)
      .map(c => c.nombre);
    if (!validNames.includes(name)) {
      return json({ error: "Nombre de moneda inválido." }, { status: 400 });
    }
  }

  const forceDuplicate = form.get("force_duplicate")?.toString() === "true";
  if (!forceDuplicate) {
    const existing = await db
      .prepare(
        `SELECT id, name, country, year, denomination, condition
         FROM coins
         WHERE user_id = ? AND country IS ? AND denomination IS ? AND name = ? AND year IS ?
         LIMIT 1`
      )
      .bind(user.id, country, denomination, name, year ?? null)
      .first<{ id: string; name: string; country: string | null; year: number | null; denomination: string | null; condition: string | null }>();
    if (existing) {
      return json({ duplicateWarning: existing });
    }
  }

  const rl = await checkRateLimit(db, user.id, "add_coin", 20, 24);
  if (!rl.allowed) {
    return json({ error: `Límite de monedas diario alcanzado. Podés volver a intentar en ${Math.ceil(rl.retryAfterSeconds / 60)} minutos.` }, { status: 429 });
  }

  const MAX_COINS = 500;
  let coinCount = 0;
  try {
    const row = await db
      .prepare("SELECT COUNT(*) as count FROM coins WHERE user_id = ?")
      .bind(user.id)
      .first<{ count: number }>();
    coinCount = row?.count ?? 0;
  } catch (e) {
    return json({ error: "Error al verificar el límite de monedas." }, { status: 500 });
  }
  if (coinCount >= MAX_COINS) {
    return json({ error: "Límite de monedas alcanzado." }, { status: 429 });
  }

  const uploadPhoto = async (slot: string): Promise<string | null> => {
    const file = form.get(slot);
    if (!file || !(file instanceof File) || file.size === 0) return null;
    if (file.size > 5 * 1024 * 1024) return null;
    if (!images) return null;
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (bytes[0] !== 0xFF || bytes[1] !== 0xD8 || bytes[2] !== 0xFF) return null;
    const key = `${user.id}/${coinId}/${slot}`;
    await images.put(key, buffer, { httpMetadata: { contentType: "image/jpeg" } });
    return key;
  };

  const [photoObverse, photoReverse, photoEdge, photoDetail] =
    await Promise.all([
      uploadPhoto("photo_obverse"),
      uploadPhoto("photo_reverse"),
      uploadPhoto("photo_edge"),
      uploadPhoto("photo_detail"),
    ]);

  const uploadedKeys = [photoObverse, photoReverse, photoEdge, photoDetail].filter(
    (k): k is string => k !== null
  );

  try {
    await db
      .prepare(
        `INSERT INTO coins
          (id, user_id, name, country, year, denomination, condition, mint,
           catalog_ref, estimated_value, notes,
           photo_obverse, photo_reverse, photo_edge, photo_detail, registry_match)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        coinId, user.id, name, country, year, denomination, condition, mint,
        catalogRef, estimatedValue, notes,
        photoObverse, photoReverse, photoEdge, photoDetail, registryMatch ? 1 : 0
      )
      .run();
  } catch (e) {
    // Rollback: eliminar imágenes subidas a R2 si el INSERT en DB falló
    if (images && uploadedKeys.length > 0) {
      await Promise.allSettled(uploadedKeys.map((key) => images.delete(key)));
    }
    return json({ error: "Error al guardar la moneda." }, { status: 500 });
  }

  return redirect("/mycollection");
}

function SellCoinControl({ coin, onShowForm }: { coin: Coin; onShowForm: () => void }) {
  const fetcher = useFetcher<{ success?: boolean; error?: string }>();
  const submitting = fetcher.state === "submitting";

  if (coin.for_sale) {
    return (
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="text-[9px] uppercase tracking-widest text-emerald-400/60 shrink-0">en venta</span>
        <span className="text-[10px] text-[#C9A46A] shrink-0">${(coin.asking_price ?? 0).toFixed(2)}</span>
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="unlist_coin" />
          <input type="hidden" name="coin_id" value={coin.id} />
          <button
            type="submit"
            disabled={submitting}
            className="text-[9px] text-[rgba(242,236,224,0.3)] hover:text-red-400/70 transition-colors"
          >
            quitar
          </button>
        </fetcher.Form>
      </div>
    );
  }

  return (
    <button
      onClick={onShowForm}
      className="flex-1 text-[10px] uppercase tracking-widest font-medium py-1 rounded-lg border border-[rgba(210,180,130,0.2)] text-[rgba(201,164,106,0.6)] hover:border-[rgba(210,180,130,0.45)] hover:text-[#C9A46A] hover:bg-[rgba(201,164,106,0.08)] transition-all"
    >
      Vender
    </button>
  );
}

function SellCoinForm({ coin, onClose }: { coin: Coin; onClose: () => void }) {
  const fetcher = useFetcher<{ success?: boolean; error?: string }>();
  const submitting = fetcher.state === "submitting";

  return (
    <fetcher.Form method="post" className="flex flex-col gap-1.5" onSubmit={onClose}>
      <input type="hidden" name="intent" value="list_coin" />
      <input type="hidden" name="coin_id" value={coin.id} />
      <input
        type="number"
        name="asking_price"
        step="0.01"
        min="0"
        placeholder="Precio USD"
        autoFocus
        className="w-full text-[11px] text-center bg-transparent border border-[rgba(210,180,130,0.35)] rounded-md px-2 py-1 text-[#F2ECE0] placeholder:text-[rgba(242,236,224,0.25)] focus:outline-none focus:border-[rgba(210,180,130,0.6)]"
      />
      <div className="flex gap-1">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 text-[10px] py-1 rounded-md bg-[rgba(201,164,106,0.12)] text-[#C9A46A] border border-[rgba(210,180,130,0.25)] hover:bg-[rgba(201,164,106,0.22)] transition-colors"
        >
          Publicar
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-2 text-[10px] rounded-md text-[rgba(242,236,224,0.35)] hover:text-[rgba(242,236,224,0.6)] transition-colors border border-[rgba(210,180,130,0.1)]"
        >
          ✕
        </button>
      </div>
    </fetcher.Form>
  );
}

function DeleteCoinButton({ coinId, coinName }: { coinId: string; coinName: string }) {
  const fetcher = useFetcher();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={fetcher.state !== "idle"}
        onClick={() => setConfirmOpen(true)}
        title="Eliminar moneda"
        className="p-1.5 rounded-lg text-[rgba(239,68,68,0.4)] hover:text-red-400 hover:bg-[rgba(239,68,68,0.08)] transition-all shrink-0"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4h6v2" />
        </svg>
      </button>
      <DeleteConfirmModal
        isOpen={confirmOpen}
        coinName={coinName}
        onConfirm={() => {
          fetcher.submit({ intent: "delete_coin", id: coinId }, { method: "post" });
          setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

function CoinCardItem({
  coin,
  claimStatus,
  onSelect,
  onEdit,
}: {
  coin: Coin;
  claimStatus: { status: string; expires_at?: number | null; coin_id_hash?: string | null; reject_reason?: string | null } | undefined;
  onSelect: () => void;
  onEdit: () => void;
}) {
  const [showSellForm, setShowSellForm] = useState(false);
  const isLocked = claimStatus && ["pending", "approved", "claimed"].includes(claimStatus.status);

  return (
    <div className="flex flex-col rounded-xl border border-[rgba(210,180,130,0.18)] bg-[rgba(14,11,10,0.4)] overflow-hidden">
      <div className="p-3 cursor-pointer" onClick={onSelect}>
        <CoinCard coin={coin} />
      </div>
      <div className="border-t border-[rgba(210,180,130,0.12)] px-2 py-1.5">
        {showSellForm ? (
          <SellCoinForm coin={coin} onClose={() => setShowSellForm(false)} />
        ) : (
          <div className="flex items-center gap-1">
            <SellCoinControl coin={coin} onShowForm={() => setShowSellForm(true)} />
            {!isLocked && (
              <button
                type="button"
                onClick={onEdit}
                title="Editar moneda"
                className="p-1.5 rounded-lg text-[rgba(201,164,106,0.4)] hover:text-[#C9A46A] hover:bg-[rgba(201,164,106,0.08)] transition-all shrink-0"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            )}
            <DeleteCoinButton coinId={coin.id} coinName={coin.name} />
            <ClaimButton
              coinId={coin.id}
              registryMatch={coin.registry_match}
              initialStatus={(claimStatus?.status ?? "eligible") as "eligible" | "pending" | "approved" | "rejected" | "claimed"}
              initialExpiresAt={claimStatus?.expires_at}
              initialCoinIdHash={claimStatus?.coin_id_hash}
              initialRejectReason={claimStatus?.reject_reason}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyCollection() {
  const { user, coins, filters, seriesProgressByCountry, allCoins, claimStatuses } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [editCoin, setEditCoin] = useState<Coin | null>(null);

  const coinsByCountry = allCoins.reduce<Record<string, number>>((acc, coin) => {
    if (coin.country) acc[coin.country] = (acc[coin.country] ?? 0) + 1;
    return acc;
  }, {});

  const isEmpty = coins.length === 0;
  const hasFilters = filters.q || filters.country || filters.year || filters.condition;

  return (
    <main className="min-h-screen text-[#F2ECE0] px-4 py-6 sm:px-6 sm:py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-y-3 mb-6 sm:mb-8">
          <div className="flex items-center gap-4">
            <a
              href="/home"
              className="p-2 rounded-lg border border-[rgba(210,180,130,0.2)] text-[rgba(201,164,106,0.6)] hover:text-[#C9A46A] hover:border-[rgba(210,180,130,0.4)] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </a>
            <div>
              <h1
                className="text-2xl font-semibold text-[#C9A46A]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Mi Colección
              </h1>
              <p className="text-xs text-[rgba(242,236,224,0.4)] mt-0.5">
                {coins.length} {coins.length === 1 ? "pieza" : "piezas"}
                {hasFilters ? " (filtradas)" : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <WalletConnectButton />
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-[rgba(201,164,106,0.12)] text-[#C9A46A] border border-[rgba(210,180,130,0.3)] hover:bg-[rgba(201,164,106,0.22)] hover:border-[rgba(210,180,130,0.5)] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Agregar pieza
            </button>
          </div>
        </div>

        {/* Progreso por serie + Timeline de años */}
        <SeriesProgress seriesProgressByCountry={seriesProgressByCountry} />
        <YearTimeline coins={allCoins} />

        {/* Mapa personal */}
        <div className="mb-6">
          <WorldMap
            coinsByCountry={coinsByCountry}
            colorScheme="amber"
            title="Mi colección por país"
          />
        </div>

        {/* Filtros */}
        <div className="mb-6">
          <CoinFilters filters={filters} />
        </div>

        {/* Galería */}
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-[rgba(242,236,224,0.3)]">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="12" cy="12" r="8" />
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
            </svg>
            <p className="text-sm">
              {hasFilters
                ? "No hay piezas que coincidan con los filtros"
                : "Tu colección está vacía — agrega tu primera pieza"}
            </p>
            {!hasFilters && (
              <button
                onClick={() => setModalOpen(true)}
                className="mt-2 text-sm text-[#C9A46A] underline underline-offset-4 hover:text-[rgba(201,164,106,0.8)] transition-colors"
              >
                Agregar primera pieza
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {coins.map((coin) => (
              <CoinCardItem
                key={coin.id}
                coin={coin}
                claimStatus={claimStatuses[coin.id]}
                onSelect={() => setSelectedCoin(coin)}
                onEdit={() => setEditCoin(coin)}
              />
            ))}
          </div>
        )}
      </div>

      <AddCoinModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
      <CoinDetailModal coin={selectedCoin} onClose={() => setSelectedCoin(null)} />
      <EditCoinModal isOpen={editCoin !== null} onClose={() => setEditCoin(null)} coin={editCoin} />
    </main>
  );
}
