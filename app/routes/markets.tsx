import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, useFetcher, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { createAuth } from "~/lib/auth.server";
import { checkRateLimit } from "~/lib/rateLimit.server";
import { CustomSelect } from "~/components/ui/CustomSelect";

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

  let listings: MarketListing[];
  try {
    const { results } = await db
      .prepare(query)
      .bind(...values)
      .all<MarketListing>();
    listings = results;
  } catch (e) {
    throw new Response("Error al cargar el mercado", { status: 500 });
  }

  return json({ user, listings, filters: { q, country, condition } });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  const user = await authenticator.isAuthenticated(request);
  if (!user) throw redirect("/");

  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "contact_seller") {
    const coin_id = form.get("coin_id") as string;
    const seller_id = form.get("seller_id") as string;
    const buyer_contact = (form.get("buyer_contact") as string | null) || null;
    const message = (form.get("message") as string)?.trim();

    if (!coin_id || !seller_id) return json({ ok: false, error: "Datos inválidos." });
    if (!message) return json({ ok: false, error: "El mensaje no puede estar vacío." });
    if (seller_id === user.id) return json({ ok: false, error: "No podés contactarte a vos mismo." });

    if (buyer_contact && buyer_contact.trim().length > 200) {
      return json({ ok: false, error: "buyer_contact demasiado largo" });
    }
    if (message.trim().length > 1000) {
      return json({ ok: false, error: "Mensaje demasiado largo (máx. 1000 chars)" });
    }

    const db = context.cloudflare.env.DB;
    const rl = await checkRateLimit(db, user.id, "contact_seller", 5, 1);
    if (!rl.allowed) {
      return json({ ok: false, error: `Límite de mensajes alcanzado. Podés volver a intentar en ${Math.ceil(rl.retryAfterSeconds / 60)} minutos.` });
    }

    const id = crypto.randomUUID();

    try {
      await db
        .prepare(
          `INSERT INTO messages (id, coin_id, seller_id, buyer_id, buyer_name, buyer_email, buyer_contact, message)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(id, coin_id, seller_id, user.id, user.name, user.email, buyer_contact, message)
        .run();
    } catch (e) {
      return json({ ok: false, error: "Error al enviar el mensaje." });
    }

    return json({ ok: true, error: null });
  }

  return json({ ok: false, error: "Acción no reconocida." });
}

const CONDITIONS = ["MS", "AU", "XF", "VF", "F", "VG", "G", "P"];
const CONDITION_OPTIONS = CONDITIONS.map((c) => ({ value: c, label: c }));

export default function Markets() {
  const { user, listings, filters } = useLoaderData<typeof loader>();
  const hasFilters = filters.q || filters.country || filters.condition;
  const isEmpty = listings.length === 0;
  const [activeContact, setActiveContact] = useState<MarketListing | null>(null);
  const [conditionFilter, setConditionFilter] = useState(filters.condition);

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
          <CustomSelect
            name="condition"
            value={conditionFilter}
            onChange={setConditionFilter}
            options={CONDITION_OPTIONS}
            placeholder="Todas las condiciones"
          />
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
                onContact={() => setActiveContact(listing)}
              />
            ))}
          </div>
        )}
      </div>

      {activeContact && (
        <ContactModal
          listing={activeContact}
          buyerName={user.name}
          onClose={() => setActiveContact(null)}
        />
      )}
    </main>
  );
}

function ListingCard({
  listing,
  isOwn,
  onContact,
}: {
  listing: MarketListing;
  isOwn: boolean;
  onContact: () => void;
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

        {!isOwn && (
          <button
            type="button"
            onClick={onContact}
            className="w-full text-center text-[10px] py-2 rounded-lg bg-[rgba(201,164,106,0.12)] text-[#C9A46A] border border-[rgba(210,180,130,0.3)] hover:bg-[rgba(201,164,106,0.22)] hover:border-[rgba(210,180,130,0.5)] transition-colors uppercase tracking-wider"
          >
            Contactar
          </button>
        )}
      </div>
    </div>
  );
}

function ContactModal({
  listing,
  buyerName,
  onClose,
}: {
  listing: MarketListing;
  buyerName: string;
  onClose: () => void;
}) {
  const fetcher = useFetcher<{ ok: boolean; error: string | null }>();
  const sent = fetcher.data?.ok === true;
  const serverError = fetcher.data?.error;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(10,8,7,0.8)] backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl border border-[rgba(210,180,130,0.25)] bg-[rgba(20,17,16,0.97)] p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2
              className="text-lg font-semibold text-[#C9A46A]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Contactar vendedor
            </h2>
            <p className="text-xs text-[rgba(242,236,224,0.4)] mt-0.5 truncate max-w-[280px]">
              {listing.name}
              {listing.year ? ` · ${listing.year}` : ""}
              {listing.country ? ` · ${listing.country}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[rgba(242,236,224,0.3)] hover:text-[rgba(242,236,224,0.7)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#C9A46A" strokeWidth="1.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p className="text-sm text-[rgba(242,236,224,0.7)]">
              Mensaje enviado. El vendedor podrá ver tus datos de contacto en su buzón.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 px-5 py-2 text-sm rounded-xl bg-[rgba(201,164,106,0.12)] text-[#C9A46A] border border-[rgba(210,180,130,0.3)] hover:bg-[rgba(201,164,106,0.22)] transition-colors"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="contact_seller" />
            <input type="hidden" name="coin_id" value={listing.id} />
            <input type="hidden" name="seller_id" value={listing.user_id} />

            <div className="flex flex-col gap-4">
              {/* Datos pre-llenados */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[rgba(242,236,224,0.35)] mb-1 block">Nombre</label>
                <div className="text-sm text-[rgba(242,236,224,0.5)] bg-[rgba(14,11,10,0.5)] border border-[rgba(210,180,130,0.1)] rounded-xl px-3 py-2.5 truncate">
                  {buyerName}
                </div>
              </div>

              {/* Contacto adicional */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[rgba(242,236,224,0.35)] mb-1 block">
                  Teléfono / WhatsApp <span className="normal-case">(opcional)</span>
                </label>
                <input
                  type="text"
                  name="buyer_contact"
                  placeholder="+54 9 11 1234-5678"
                  className="w-full text-sm bg-[rgba(14,11,10,0.7)] border border-[rgba(210,180,130,0.2)] rounded-xl px-4 py-2.5 text-[#F2ECE0] placeholder:text-[rgba(242,236,224,0.2)] focus:outline-none focus:border-[rgba(210,180,130,0.5)]"
                />
              </div>

              {/* Mensaje */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[rgba(242,236,224,0.35)] mb-1 block">
                  Mensaje <span className="text-[#C9A46A]">*</span>
                </label>
                <textarea
                  name="message"
                  required
                  rows={4}
                  placeholder="Hola, me interesa tu pieza. ¿Está disponible para negociar?"
                  className="w-full text-sm bg-[rgba(14,11,10,0.7)] border border-[rgba(210,180,130,0.2)] rounded-xl px-4 py-2.5 text-[#F2ECE0] placeholder:text-[rgba(242,236,224,0.2)] focus:outline-none focus:border-[rgba(210,180,130,0.5)] resize-none"
                />
              </div>

              {serverError && (
                <p className="text-xs text-red-400">{serverError}</p>
              )}

              <button
                type="submit"
                disabled={fetcher.state !== "idle"}
                className="w-full py-2.5 text-sm rounded-xl bg-[rgba(201,164,106,0.15)] text-[#C9A46A] border border-[rgba(210,180,130,0.35)] hover:bg-[rgba(201,164,106,0.25)] hover:border-[rgba(210,180,130,0.55)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {fetcher.state !== "idle" ? "Enviando…" : "Enviar mensaje"}
              </button>
            </div>
          </fetcher.Form>
        )}
      </div>
    </div>
  );
}
