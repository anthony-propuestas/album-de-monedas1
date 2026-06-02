import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { createAuth } from "~/lib/auth.server";
import { CoinCard } from "~/components/CoinCard";
import { CoinDetailModal } from "~/components/CoinDetailModal";
import type { Coin } from "~/components/CoinCard";

export const meta: MetaFunction = () => [
  { title: "Colección Completa — Album de Monedas" },
];

interface CoinWithOwner extends Coin {
  owner_id: string;
  owner_name: string;
  owner_picture: string | null;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  const user = await authenticator.isAuthenticated(request);
  if (!user) throw redirect("/");

  const url = new URL(request.url);
  const country = url.searchParams.get("country") ?? "";
  const denomination = url.searchParams.get("denomination") ?? "";
  const yearFrom = url.searchParams.get("year_from") ?? "";
  const yearTo = url.searchParams.get("year_to") ?? "";

  const db = context.cloudflare.env.DB;

  let query = `
    SELECT c.id, c.user_id, c.name, c.country, c.year, c.denomination,
           c.condition, c.mint, c.catalog_ref, c.estimated_value, c.notes,
           c.photo_obverse, c.photo_reverse, c.photo_edge, c.photo_detail,
           c.created_at, c.for_sale, c.asking_price,
           u.id AS owner_id, u.name AS owner_name, u.picture AS owner_picture
    FROM coins c
    JOIN users u ON u.id = c.user_id
    WHERE c.rowid = (
      SELECT MIN(ic.rowid) FROM coins ic
      WHERE ic.country IS c.country
        AND ic.denomination IS c.denomination
        AND ic.name = c.name
        AND ic.year IS c.year
    )
  `;
  const values: (string | number)[] = [];

  if (country) {
    query += " AND c.country = ?";
    values.push(country);
  }
  if (denomination) {
    query += " AND c.denomination = ?";
    values.push(denomination);
  }
  if (yearFrom) {
    query += " AND c.year >= ?";
    values.push(parseInt(yearFrom, 10));
  }
  if (yearTo) {
    query += " AND c.year <= ?";
    values.push(parseInt(yearTo, 10));
  }

  query += " ORDER BY c.country, c.year, c.denomination";

  try {
    const { results: coins } = values.length > 0
      ? await db.prepare(query).bind(...values).all<CoinWithOwner>()
      : await db.prepare(query).all<CoinWithOwner>();

    const countries = [...new Set(coins.map((c) => c.country).filter(Boolean))].sort() as string[];
    const denominations = [...new Set(coins.map((c) => c.denomination).filter(Boolean))].sort() as string[];

    return json({ coins, filters: { country, denomination, yearFrom, yearTo }, countries, denominations });
  } catch (e) {
    throw new Response("Error al cargar la colección completa", { status: 500 });
  }
}

export default function FullCollection() {
  const { coins, filters, countries, denominations } = useLoaderData<typeof loader>();
  const [selectedCoin, setSelectedCoin] = useState<CoinWithOwner | null>(null);

  const hasFilters = filters.country || filters.denomination || filters.yearFrom || filters.yearTo;

  return (
    <main className="min-h-screen text-[#F2ECE0] px-4 py-6 sm:px-6 sm:py-8">
      <div className="max-w-6xl mx-auto">

        <div className="flex items-center gap-4 mb-6 sm:mb-8">
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
              Colección Completa
            </h1>
            <p className="text-xs text-[rgba(242,236,224,0.4)] mt-0.5">
              {coins.length} {coins.length === 1 ? "pieza única" : "piezas únicas"}
              {hasFilters ? " (filtradas)" : ""}
            </p>
          </div>
        </div>

        <Form method="get" className="mb-6 flex flex-wrap gap-3">
          <select
            name="country"
            defaultValue={filters.country}
            className="bg-[rgba(20,17,16,0.85)] border border-[rgba(210,180,130,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2ECE0] focus:outline-none focus:border-[rgba(210,180,130,0.5)]"
          >
            <option value="">Todos los países</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            name="denomination"
            defaultValue={filters.denomination}
            className="bg-[rgba(20,17,16,0.85)] border border-[rgba(210,180,130,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2ECE0] focus:outline-none focus:border-[rgba(210,180,130,0.5)]"
          >
            <option value="">Todas las denominaciones</option>
            {denominations.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <input
              type="number"
              name="year_from"
              placeholder="Año desde"
              defaultValue={filters.yearFrom}
              className="w-28 bg-[rgba(20,17,16,0.85)] border border-[rgba(210,180,130,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2ECE0] placeholder:text-[rgba(242,236,224,0.25)] focus:outline-none focus:border-[rgba(210,180,130,0.5)]"
            />
            <span className="text-[rgba(242,236,224,0.3)] text-sm">—</span>
            <input
              type="number"
              name="year_to"
              placeholder="Año hasta"
              defaultValue={filters.yearTo}
              className="w-28 bg-[rgba(20,17,16,0.85)] border border-[rgba(210,180,130,0.2)] rounded-lg px-3 py-2 text-sm text-[#F2ECE0] placeholder:text-[rgba(242,236,224,0.25)] focus:outline-none focus:border-[rgba(210,180,130,0.5)]"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-lg border border-[rgba(210,180,130,0.3)] text-[#C9A46A] text-sm hover:bg-[rgba(201,164,106,0.12)] transition-colors"
          >
            Filtrar
          </button>

          {hasFilters && (
            <a
              href="/full-collection"
              className="px-4 py-2 rounded-lg text-[rgba(242,236,224,0.4)] text-sm hover:text-[rgba(242,236,224,0.7)] transition-colors"
            >
              Limpiar
            </a>
          )}
        </Form>

        {coins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-[rgba(242,236,224,0.3)]">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="12" cy="12" r="8" />
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
            </svg>
            <p className="text-sm">
              {hasFilters
                ? "No hay piezas que coincidan con los filtros"
                : "Aún no hay piezas en la plataforma"}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {coins.map((coin) => (
              <div key={coin.id} className="flex flex-col items-center gap-1">
                <CoinCard coin={coin} onClick={() => setSelectedCoin(coin)} />
                <a
                  href={`/collection/${coin.owner_id}`}
                  className="flex items-center gap-1 text-[10px] text-[rgba(201,164,106,0.6)] hover:text-[#C9A46A] transition-colors max-w-full px-2"
                >
                  {coin.owner_picture && (
                    <img
                      src={coin.owner_picture}
                      alt=""
                      className="w-3.5 h-3.5 rounded-full object-cover flex-shrink-0"
                    />
                  )}
                  <span className="truncate">{coin.owner_name}</span>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      <CoinDetailModal coin={selectedCoin} onClose={() => setSelectedCoin(null)} />
    </main>
  );
}
