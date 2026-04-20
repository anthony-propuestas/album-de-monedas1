import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { useLoaderData, useNavigation } from "@remix-run/react";
import { useState } from "react";
import { AddCoinModal } from "~/components/AddCoinModal";
import { CoinCard } from "~/components/CoinCard";
import { CoinFilters } from "~/components/CoinFilters";
import { createAuth } from "~/lib/auth.server";
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

  return json({ user, coins, filters: { q, country, year, condition } });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  const user = await authenticator.isAuthenticated(request);
  if (!user) throw redirect("/");

  const form = await request.formData();
  const intent = form.get("intent")?.toString();

  if (intent !== "add_coin") {
    return json({ error: "Acción no reconocida." }, { status: 400 });
  }

  const coinId = crypto.randomUUID();
  const db = context.cloudflare.env.DB;
  const images = context.cloudflare.env.IMAGES as R2Bucket | undefined;

  const uploadPhoto = async (slot: string): Promise<string | null> => {
    const file = form.get(slot);
    if (!file || !(file instanceof File) || file.size === 0) return null;
    if (!images) return null;
    const key = `${user.id}/${coinId}/${slot}`;
    await images.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });
    return key;
  };

  const [photoObverse, photoReverse, photoEdge, photoDetail] =
    await Promise.all([
      uploadPhoto("photo_obverse"),
      uploadPhoto("photo_reverse"),
      uploadPhoto("photo_edge"),
      uploadPhoto("photo_detail"),
    ]);

  const name = form.get("name")?.toString() ?? "";
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

export default function MyCollection() {
  const { user, coins, filters } = useLoaderData<typeof loader>();
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
              <CoinCard key={coin.id} coin={coin} />
            ))}
          </div>
        )}
      </div>

      <AddCoinModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </main>
  );
}
