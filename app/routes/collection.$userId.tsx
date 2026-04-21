import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { createAuth } from "~/lib/auth.server";
import { CoinCard } from "~/components/CoinCard";
import { CoinFilters } from "~/components/CoinFilters";
import type { Coin } from "~/components/CoinCard";

interface ProfileUser {
  id: string;
  name: string;
  picture: string | null;
  country: string | null;
  collecting_since: string | null;
}

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  const user = await authenticator.isAuthenticated(request);
  if (!user) throw redirect("/");

  const db = context.cloudflare.env.DB;

  const profileUser = await db
    .prepare(
      "SELECT id, name, picture, country, collecting_since FROM users WHERE id = ?"
    )
    .bind(params.userId)
    .first<ProfileUser>();

  if (!profileUser) throw new Response("Not Found", { status: 404 });

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const country = url.searchParams.get("country") ?? "";
  const year = url.searchParams.get("year") ?? "";
  const condition = url.searchParams.get("condition") ?? "";
  const from = url.searchParams.get("from") ?? "";

  let query = "SELECT * FROM coins WHERE user_id = ?";
  const values: (string | number)[] = [profileUser.id];

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

  return json({
    profileUser,
    coins,
    filters: { q, country, year, condition },
    from,
  });
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  {
    title: `Colección de ${data?.profileUser.name ?? "coleccionista"} — Album de Monedas`,
  },
];

export default function PublicCollection() {
  const { profileUser, coins, filters, from } = useLoaderData<typeof loader>();

  const backHref = from ? `/collections/${from}` : "/collections";
  const backLabel = from ? "Volver al ranking" : "Grandes Colecciones";
  const isEmpty = coins.length === 0;
  const hasFilters = filters.q || filters.country || filters.year || filters.condition;

  return (
    <main className="min-h-screen text-[#F2ECE0] px-6 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <a
            href={backHref}
            className="p-2 rounded-lg border border-[rgba(210,180,130,0.2)] text-[rgba(201,164,106,0.6)] hover:text-[#C9A46A] hover:border-[rgba(210,180,130,0.4)] transition-colors flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </a>

          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full overflow-hidden bg-[rgba(201,164,106,0.1)] border border-[rgba(210,180,130,0.25)] flex-shrink-0 flex items-center justify-center text-[#C9A46A] text-lg font-semibold">
              {profileUser.picture ? (
                <img
                  src={profileUser.picture}
                  alt={profileUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                profileUser.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-[rgba(242,236,224,0.3)] mb-0.5" style={{ fontFamily: "var(--font-mono)" }}>
                {backLabel}
              </p>
              <h1
                className="text-xl font-semibold text-[#C9A46A] truncate"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {profileUser.name}
              </h1>
              <p className="text-xs text-[rgba(242,236,224,0.4)] mt-0.5">
                {coins.length} {coins.length === 1 ? "pieza" : "piezas"}
                {hasFilters ? " (filtradas)" : ""}
                {profileUser.collecting_since
                  ? ` · Desde ${profileUser.collecting_since}`
                  : ""}
              </p>
            </div>
          </div>
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
                : "Este coleccionista aún no tiene piezas"}
            </p>
          </div>
        ) : (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(135px, 1fr))" }}
          >
            {coins.map((coin) => (
              <CoinCard key={coin.id} coin={coin} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
