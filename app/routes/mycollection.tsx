import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { useLoaderData, useNavigation, useFetcher } from "@remix-run/react";
import { useState } from "react";
import { AddCoinModal } from "~/components/AddCoinModal";
import { CoinCard } from "~/components/CoinCard";
import { CoinFilters } from "~/components/CoinFilters";
import { SeriesProgress } from "~/components/SeriesProgress";
import { YearTimeline } from "~/components/YearTimeline";
import { createAuth } from "~/lib/auth.server";
import { COINS_BY_COUNTRY } from "~/lib/coins";
import type { Coin } from "~/components/CoinCard";

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

  const { results: coins } = await db
    .prepare(query)
    .bind(...values)
    .all<Coin>();

  const { results: allCoins } = await db
    .prepare("SELECT name, country, year FROM coins WHERE user_id = ?")
    .bind(user.id)
    .all<{ name: string; country: string | null; year: number | null }>();

  const argCoins = allCoins.filter((c) => c.country === "AR");
  const ownedNames = new Set(argCoins.map((c) => c.name));
  const catalog = COINS_BY_COUNTRY["AR"] ?? [];
  const seriesMap = new Map<string, { total: number; owned: number }>();
  for (const entry of catalog) {
    const key = entry.serie ?? "Sin serie";
    const cur = seriesMap.get(key) ?? { total: 0, owned: 0 };
    cur.total += 1;
    if (ownedNames.has(entry.nombre)) cur.owned += 1;
    seriesMap.set(key, cur);
  }
  const seriesProgress = Array.from(seriesMap.entries()).map(([serie, data]) => ({
    serie,
    ...data,
    pct: Math.round((data.owned / data.total) * 100),
  }));

  return json({ user, coins, filters: { q, country, year, condition }, seriesProgress, allCoins });
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
    const owned = await db
      .prepare("SELECT id FROM coins WHERE id = ? AND user_id = ?")
      .bind(listId, user.id)
      .first<{ id: string }>();
    if (!owned) return json({ error: "Moneda no encontrada." }, { status: 404 });
    await db
      .prepare("UPDATE coins SET for_sale = 1, asking_price = ? WHERE id = ? AND user_id = ?")
      .bind(askingPrice, listId, user.id)
      .run();
    return json({ success: true });
  }

  if (intent === "unlist_coin") {
    const listId = form.get("coin_id")?.toString();
    if (!listId) return json({ error: "ID requerido." }, { status: 400 });
    await db
      .prepare("UPDATE coins SET for_sale = 0, asking_price = NULL WHERE id = ? AND user_id = ?")
      .bind(listId, user.id)
      .run();
    return json({ success: true });
  }

  if (intent !== "add_coin") {
    return json({ error: "Acción no reconocida." }, { status: 400 });
  }

  const coinId = crypto.randomUUID();
  const images = context.cloudflare.env.IMAGES as R2Bucket | undefined;

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

  const VALID_CONDITIONS = ["MS", "AU", "XF", "VF", "F", "VG", "G", "P"] as const;
  if (condition && !(VALID_CONDITIONS as readonly string[]).includes(condition)) {
    return json({ error: "Condición inválida." }, { status: 400 });
  }

  const coinsForCountry = country ? COINS_BY_COUNTRY[country] : null;
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

  const MAX_COINS = 500;
  const row = await db
    .prepare("SELECT COUNT(*) as count FROM coins WHERE user_id = ?")
    .bind(user.id)
    .first<{ count: number }>();
  const coinCount = row?.count ?? 0;
  if (coinCount >= MAX_COINS) {
    return json({ error: "Límite de monedas alcanzado." }, { status: 429 });
  }

  await db
    .prepare(
      `INSERT INTO coins
        (id, user_id, name, country, year, denomination, condition, mint,
         catalog_ref, estimated_value, notes,
         photo_obverse, photo_reverse, photo_edge, photo_detail)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      coinId, user.id, name, country, year, denomination, condition, mint,
      catalogRef, estimatedValue, notes,
      photoObverse, photoReverse, photoEdge, photoDetail
    )
    .run();

  return redirect("/mycollection");
}

function SellCoinControl({ coin }: { coin: Coin }) {
  const fetcher = useFetcher<{ success?: boolean; error?: string }>();
  const [showInput, setShowInput] = useState(false);
  const submitting = fetcher.state === "submitting";

  if (coin.for_sale) {
    return (
      <div className="flex flex-col items-center gap-0.5 mt-1 px-1">
        <span className="text-[9px] uppercase tracking-widest text-emerald-400/60">en venta</span>
        <span className="text-xs text-[#C9A46A]">${(coin.asking_price ?? 0).toFixed(2)}</span>
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="unlist_coin" />
          <input type="hidden" name="coin_id" value={coin.id} />
          <button
            type="submit"
            disabled={submitting}
            className="text-[9px] text-[rgba(242,236,224,0.3)] hover:text-red-400/70 transition-colors mt-0.5"
          >
            quitar
          </button>
        </fetcher.Form>
      </div>
    );
  }

  if (showInput) {
    return (
      <fetcher.Form
        method="post"
        className="flex flex-col gap-1.5 mt-1.5 px-1"
        onSubmit={() => setShowInput(false)}
      >
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
            onClick={() => setShowInput(false)}
            className="px-2 text-[10px] rounded-md text-[rgba(242,236,224,0.35)] hover:text-[rgba(242,236,224,0.6)] transition-colors border border-[rgba(210,180,130,0.1)]"
          >
            ✕
          </button>
        </div>
      </fetcher.Form>
    );
  }

  return (
    <button
      onClick={() => setShowInput(true)}
      className="mt-1.5 w-full text-[10px] uppercase tracking-widest font-medium py-1.5 rounded-lg border border-[rgba(210,180,130,0.25)] text-[rgba(201,164,106,0.7)] hover:border-[rgba(210,180,130,0.55)] hover:text-[#C9A46A] hover:bg-[rgba(201,164,106,0.08)] transition-all"
    >
      Vender
    </button>
  );
}

export default function MyCollection() {
  const { user, coins, filters, seriesProgress, allCoins } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [modalOpen, setModalOpen] = useState(false);

  const isEmpty = coins.length === 0;
  const hasFilters = filters.q || filters.country || filters.year || filters.condition;

  return (
    <main className="min-h-screen text-[#F2ECE0] px-6 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
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

        {/* Progreso por serie + Timeline de años */}
        <SeriesProgress series={seriesProgress} />
        <YearTimeline coins={allCoins} />

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
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(135px, 1fr))",
            }}
          >
            {coins.map((coin) => (
              <div key={coin.id} className="flex flex-col">
                <CoinCard coin={coin} />
                <SellCoinControl coin={coin} />
              </div>
            ))}
          </div>
        )}
      </div>

      <AddCoinModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </main>
  );
}
