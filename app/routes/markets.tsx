import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData } from "@remix-run/react";
import { createAuth } from "~/lib/auth.server";

export const meta: MetaFunction = () => [
  { title: "Mercado — Album de Monedas" },
];

interface MarketListing {
  id: string;
  user_id: string;
  name: string;
  country: string | null;
  year: number | null;
  denomination: string | null;
  condition: string | null;
  asking_price: number | null;
  photo_obverse: string | null;
  seller_name: string | null;
  seller_picture: string | null;
  ref_price: number | null;
  owner_count: number;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  const user = await authenticator.isAuthenticated(request);
  if (!user) throw redirect("/");

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const country = url.searchParams.get("country") ?? "";
  const condition = url.searchParams.get("condition") ?? "";

  const db = context.cloudflare.env.DB;

  let query = `
    SELECT c.id, c.user_id, c.name, c.country, c.year, c.denomination, c.condition,
           c.asking_price, c.photo_obverse,
           u.name as seller_name, u.picture as seller_picture,
           (SELECT AVG(c2.estimated_value) FROM coins c2
            WHERE c2.name = c.name AND c2.country = c.country AND c2.year = c.year
            AND c2.estimated_value IS NOT NULL) as ref_price,
           (SELECT COUNT(*) FROM coins c2
            WHERE c2.name = c.name AND c2.country = c.country AND c2.year = c.year) as owner_count
    FROM coins c
    JOIN users u ON c.user_id = u.id
    WHERE c.for_sale = 1
  `;
  const values: string[] = [];

  if (q) { query += " AND c.name LIKE ?"; values.push(`%${q}%`); }
  if (country) { query += " AND c.country = ?"; values.push(country); }
  if (condition) { query += " AND c.condition = ?"; values.push(condition); }

  query += " ORDER BY c.created_at DESC";

  const { results: listings } = await db
    .prepare(query)
    .bind(...values)
    .all<MarketListing>();

  return json({ user, listings, filters: { q, country, condition } });
}

const CONDITIONS = ["MS", "AU", "XF", "VF", "F", "VG", "G", "P"];

export default function Markets() {
  const { user, listings, filters } = useLoaderData<typeof loader>();
  const hasFilters = filters.q || filters.country || filters.condition;
  const isEmpty = listings.length === 0;

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
                Mercado
              </h1>
              <p className="text-xs text-[rgba(242,236,224,0.4)] mt-0.5">
                {listings.length} {listings.length === 1 ? "pieza en venta" : "piezas en venta"}
                {hasFilters ? " (filtradas)" : ""}
              </p>
            </div>
          </div>

          <a
            href="/mycollection"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-[rgba(201,164,106,0.12)] text-[#C9A46A] border border-[rgba(210,180,130,0.3)] hover:bg-[rgba(201,164,106,0.22)] hover:border-[rgba(210,180,130,0.5)] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
            Poner en venta
          </a>
        </div>

        {/* Filtros */}
        <Form method="get" className="flex flex-wrap gap-3 mb-8">
          <input
            type="text"
            name="q"
            defaultValue={filters.q}
            placeholder="Buscar pieza..."
            className="flex-1 min-w-[180px] text-sm bg-[rgba(14,11,10,0.7)] border border-[rgba(210,180,130,0.2)] rounded-xl px-4 py-2.5 text-[#F2ECE0] placeholder:text-[rgba(242,236,224,0.25)] focus:outline-none focus:border-[rgba(210,180,130,0.5)]"
          />
          <select
            name="condition"
            defaultValue={filters.condition}
            className="text-sm bg-[rgba(14,11,10,0.7)] border border-[rgba(210,180,130,0.2)] rounded-xl px-4 py-2.5 text-[rgba(242,236,224,0.7)] focus:outline-none focus:border-[rgba(210,180,130,0.5)]"
          >
            <option value="">Todas las condiciones</option>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            type="submit"
            className="px-5 py-2.5 text-sm rounded-xl bg-[rgba(201,164,106,0.12)] text-[#C9A46A] border border-[rgba(210,180,130,0.3)] hover:bg-[rgba(201,164,106,0.22)] transition-colors"
          >
            Filtrar
          </button>
          {hasFilters && (
            <a
              href="/markets"
              className="px-4 py-2.5 text-sm rounded-xl text-[rgba(242,236,224,0.4)] border border-[rgba(210,180,130,0.12)] hover:text-[rgba(242,236,224,0.7)] transition-colors"
            >
              Limpiar
            </a>
          )}
        </Form>

        {/* Contenido */}
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-[rgba(242,236,224,0.25)]">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
            <p className="text-sm text-center max-w-xs">
              {hasFilters
                ? "No hay piezas que coincidan con los filtros"
                : "El mercado está vacío — sé el primero en publicar una pieza"}
            </p>
            {!hasFilters && (
              <a
                href="/mycollection"
                className="mt-2 text-sm text-[#C9A46A] underline underline-offset-4 hover:text-[rgba(201,164,106,0.8)] transition-colors"
              >
                Ir a mi colección
              </a>
            )}
          </div>
        ) : (
          <div
            className="grid gap-5"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}
          >
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isOwn={listing.user_id === user.id}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ListingCard({
  listing,
  isOwn,
}: {
  listing: MarketListing;
  isOwn: boolean;
}) {
  const conditionColor: Record<string, string> = {
    MS: "text-emerald-400/80",
    AU: "text-emerald-400/60",
    XF: "text-amber-400/70",
    VF: "text-amber-400/55",
    F: "text-orange-400/60",
    VG: "text-orange-400/50",
    G: "text-red-400/50",
    P: "text-red-400/40",
  };

  return (
    <div className="rounded-xl border border-[rgba(210,180,130,0.2)] bg-[rgba(20,17,16,0.85)] overflow-hidden hover:border-[rgba(210,180,130,0.4)] transition-colors flex flex-col">
      {/* Foto */}
      <div className="aspect-square w-full overflow-hidden bg-[rgba(14,11,10,0.8)] flex items-center justify-center relative">
        {listing.photo_obverse ? (
          <img
            src={`/images/${listing.photo_obverse}`}
            alt={listing.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-[rgba(201,164,106,0.15)] flex flex-col items-center gap-2">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <circle cx="12" cy="12" r="8" />
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
            </svg>
          </div>
        )}
        {isOwn && (
          <span className="absolute top-2 right-2 text-[9px] uppercase tracking-widest bg-[rgba(14,11,10,0.85)] text-[rgba(201,164,106,0.6)] px-2 py-0.5 rounded-full border border-[rgba(210,180,130,0.2)]">
            Tuya
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div>
          <p className="text-sm font-medium text-[#F2ECE0] truncate">{listing.name}</p>
          <p className="text-xs text-[rgba(242,236,224,0.4)] mt-0.5 truncate">
            {[listing.country, listing.year, listing.denomination]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        {listing.condition && (
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${conditionColor[listing.condition] ?? "text-[rgba(242,236,224,0.4)]"}`}>
            {listing.condition}
          </span>
        )}

        {/* Precios */}
        <div className="pt-2 border-t border-[rgba(210,180,130,0.1)]">
          <p className="text-xl font-semibold text-[#C9A46A]">
            {listing.asking_price != null
              ? `$${listing.asking_price.toFixed(2)}`
              : "A consultar"}
          </p>
          {listing.ref_price != null && (
            <p className="text-[10px] text-[rgba(242,236,224,0.3)] mt-0.5">
              Ref. ${listing.ref_price.toFixed(2)}
              {listing.owner_count > 0 && (
                <span> · {listing.owner_count} {listing.owner_count === 1 ? "dueño" : "dueños"}</span>
              )}
            </p>
          )}
        </div>

        {/* Vendedor */}
        <div className="flex items-center gap-2 pt-2 border-t border-[rgba(210,180,130,0.1)]">
          <div className="w-6 h-6 rounded-full overflow-hidden bg-[rgba(201,164,106,0.1)] flex items-center justify-center flex-shrink-0 border border-[rgba(210,180,130,0.2)]">
            {listing.seller_picture ? (
              <img src={listing.seller_picture} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[9px] text-[#C9A46A] font-medium">
                {listing.seller_name?.charAt(0)?.toUpperCase() ?? "?"}
              </span>
            )}
          </div>
          <span className="text-xs text-[rgba(242,236,224,0.4)] truncate">
            {listing.seller_name ?? "Coleccionista"}
          </span>
        </div>

        <a
          href={`/collection/${listing.user_id}`}
          className="mt-auto block w-full text-center text-[10px] py-2 rounded-lg border border-[rgba(210,180,130,0.18)] text-[rgba(201,164,106,0.55)] hover:border-[rgba(210,180,130,0.4)] hover:text-[#C9A46A] transition-colors uppercase tracking-wider"
        >
          Ver colección
        </a>
      </div>
    </div>
  );
}
