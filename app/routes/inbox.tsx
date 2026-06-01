import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { createAuth } from "~/lib/auth.server";

export const meta: MetaFunction = () => [
  { title: "Buzón — Album de Monedas" },
];

interface Message {
  id: string;
  buyer_name: string;
  buyer_contact: string | null;
  message: string;
  created_at: number;
  is_new: number;
  coin_name: string;
  coin_country: string | null;
  coin_year: number | null;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  const user = await authenticator.isAuthenticated(request);
  if (!user) throw redirect("/");

  const db = context.cloudflare.env.DB;

  try {
    const { results: messages } = await db
      .prepare(
        `SELECT m.id, m.buyer_name, m.buyer_contact,
                m.message, m.created_at,
                CASE WHEN m.read_at IS NULL THEN 1 ELSE 0 END as is_new,
                c.name as coin_name, c.country as coin_country, c.year as coin_year
         FROM messages m
         JOIN coins c ON m.coin_id = c.id
         WHERE m.seller_id = ?
         ORDER BY m.created_at DESC`
      )
      .bind(user.id)
      .all<Message>();

    await db
      .prepare(
        "UPDATE messages SET read_at = unixepoch() WHERE seller_id = ? AND read_at IS NULL"
      )
      .bind(user.id)
      .run();

    return json({ messages });
  } catch (e) {
    throw new Response("Error al cargar el buzón", { status: 500 });
  }
}

export default function Inbox() {
  const { messages } = useLoaderData<typeof loader>();

  return (
    <main className="min-h-screen text-[#F2ECE0] px-6 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
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
              Buzón
            </h1>
            <p className="text-xs text-[rgba(242,236,224,0.4)] mt-0.5">
              {messages.length} {messages.length === 1 ? "mensaje recibido" : "mensajes recibidos"}
            </p>
          </div>
        </div>

        {/* Contenido */}
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-[rgba(242,236,224,0.25)]">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <p className="text-sm text-center max-w-xs">
              Todavía no recibiste ningún mensaje. Cuando alguien quiera contactarte por una pieza, lo verás acá.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((msg) => (
              <MessageCard key={msg.id} msg={msg} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function MessageCard({ msg }: { msg: Message }) {
  const date = new Date(msg.created_at * 1000);
  const dateStr = date.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const coinLabel = [msg.coin_name, msg.coin_country, msg.coin_year]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rounded-xl border border-[rgba(210,180,130,0.2)] bg-[rgba(20,17,16,0.85)] p-5 flex flex-col gap-3">
      {/* Top: remitente + fecha + badge nuevo */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#F2ECE0]">{msg.buyer_name}</span>
            {msg.is_new === 1 && (
              <span className="text-[9px] uppercase tracking-widest bg-[rgba(201,164,106,0.18)] text-[#C9A46A] px-2 py-0.5 rounded-full border border-[rgba(210,180,130,0.3)]">
                Nuevo
              </span>
            )}
          </div>
          {msg.buyer_contact && (
            <p className="text-xs text-[rgba(242,236,224,0.4)]">{msg.buyer_contact}</p>
          )}
        </div>
        <span className="text-[11px] text-[rgba(242,236,224,0.3)] whitespace-nowrap shrink-0">{dateStr}</span>
      </div>

      {/* Moneda consultada */}
      <div className="flex items-center gap-2 text-xs text-[rgba(242,236,224,0.4)] bg-[rgba(14,11,10,0.5)] rounded-lg px-3 py-2 border border-[rgba(210,180,130,0.1)]">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
        </svg>
        <span className="truncate">{coinLabel}</span>
      </div>

      {/* Mensaje */}
      <p className="text-sm text-[rgba(242,236,224,0.75)] leading-relaxed whitespace-pre-wrap">
        {msg.message}
      </p>
    </div>
  );
}
