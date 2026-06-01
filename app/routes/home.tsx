import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { Form, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { createAuth } from "~/lib/auth.server";
import { checkRateLimit } from "~/lib/rateLimit.server";
import { ProfileSetupModal } from "~/components/ProfileSetupModal";
import { BadgesGrid } from "~/components/BadgesGrid";
import { COINS_BY_COUNTRY } from "~/lib/coins";
import { computeEarnedBadgeIds, BADGE_MAP } from "~/lib/badges";
import type { Coin } from "~/components/CoinCard";

export const meta: MetaFunction = () => [
  { title: "Inicio — Album de Monedas" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  const user = await authenticator.isAuthenticated(request);
  if (!user) throw redirect("/");

  const db = context.cloudflare.env.DB;

  try {
    // INSERT OR IGNORE evita race condition si dos requests OAuth llegan simultáneamente
    await db
      .prepare("INSERT OR IGNORE INTO users (id, email, name, picture) VALUES (?, ?, ?, ?)")
      .bind(user.id, user.email, user.name, user.picture ?? null)
      .run();

    const profileRow = await db
      .prepare("SELECT profile_completed FROM users WHERE id = ?")
      .bind(user.id)
      .first<{ profile_completed: number }>();

    const profileCompleted = profileRow?.profile_completed === 1;

    const [statsRow, valueRow, conditionRow] = await Promise.all([
      db
        .prepare("SELECT COUNT(*) as total FROM coins WHERE user_id = ?")
        .bind(user.id)
        .first<{ total: number }>(),
      db
        .prepare(
          "SELECT COALESCE(SUM(estimated_value), 0) as total FROM coins WHERE user_id = ? AND estimated_value IS NOT NULL"
        )
        .bind(user.id)
        .first<{ total: number }>(),
      db
        .prepare(
          "SELECT condition, COUNT(*) as cnt FROM coins WHERE user_id = ? AND condition IS NOT NULL GROUP BY condition ORDER BY cnt DESC LIMIT 1"
        )
        .bind(user.id)
        .first<{ condition: string; cnt: number }>(),
    ]);

    const stats = {
      total: statsRow?.total ?? 0,
      estimatedValue: valueRow?.total ?? 0,
      topCondition: conditionRow?.condition ?? null,
    };

    // Fetch all coins once — used for coinOfDay and badges
    const { results: allCoins } = await db
      .prepare("SELECT * FROM coins WHERE user_id = ?")
      .bind(user.id)
      .all<Coin>();

    // Moneda del día
    const ownedSet = new Set(allCoins.map((c) => c.name));
    const catalog = COINS_BY_COUNTRY["AR"] ?? [];
    const missing = catalog.filter((c) => !ownedSet.has(c.nombre));
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000
    );
    const coinOfDay = missing.length > 0 ? missing[dayOfYear % missing.length] : null;

    // Badges
    const earnedIds = computeEarnedBadgeIds(allCoins);
    if (earnedIds.length > 0) {
      await Promise.all(
        earnedIds.map((id) =>
          db
            .prepare("INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)")
            .bind(user.id, id)
            .run()
        )
      );
    }
    const { results: badgeRows } = await db
      .prepare("SELECT badge_id, unlocked_at FROM user_badges WHERE user_id = ?")
      .bind(user.id)
      .all<{ badge_id: string; unlocked_at: number }>();
    const badges = badgeRows
      .filter((row) => BADGE_MAP[row.badge_id])
      .map((row) => ({ ...BADGE_MAP[row.badge_id], unlockedAt: row.unlocked_at }));

    const unreadRow = await db
      .prepare("SELECT COUNT(*) as unread FROM messages WHERE seller_id = ? AND read_at IS NULL")
      .bind(user.id)
      .first<{ unread: number }>();
    const unreadMessages = unreadRow?.unread ?? 0;

    return json({ user, profileCompleted, stats, coinOfDay, badges, unreadMessages });
  } catch (e) {
    throw new Response("Error al cargar el dashboard", { status: 500 });
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env);
  const user = await authenticator.isAuthenticated(request);
  if (!user) throw redirect("/");

  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "complete_profile") {
    const name = form.get("name")?.toString().trim();
    const country = form.get("country")?.toString().trim();
    const collectingSince = form.get("collecting_since")?.toString().trim();
    const goals = form.get("goals")?.toString().trim();

    if (!name || !country || !collectingSince || !goals) {
      return json({ error: "Todos los campos son obligatorios." });
    }

    if (name.length > 100 || goals.length > 500) {
      return json({ error: "Texto demasiado largo." }, { status: 400 });
    }

    const db = context.cloudflare.env.DB;
    const rl = await checkRateLimit(db, user.id, "complete_profile", 3, 24);
    if (!rl.allowed) {
      return json({ error: "Demasiados intentos. Podés volver a intentar mañana." }, { status: 429 });
    }
    try {
      await db
        .prepare(
          "UPDATE users SET name = ?, country = ?, collecting_since = ?, goals = ?, profile_completed = 1 WHERE id = ?"
        )
        .bind(name, country, collectingSince, goals, user.id)
        .run();
    } catch (e) {
      return json({ error: "Error al guardar el perfil." }, { status: 500 });
    }

    return json({ success: true });
  }

  return json({ error: "Acción no reconocida." });
}

const navItems = [
  { label: "Mi colección", href: "/mycollection" },
  { label: "Grandes colecciones", href: "/collections" },
  { label: "Mercados", href: "/markets" },
  { label: "Buzón", href: "/inbox" },
];

const drawerItems = [
  {
    label: "Noticias",
    href: "/news",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
        <path d="M18 14h-8M15 18h-5M10 6h8v4h-8z" />
      </svg>
    ),
  },
  {
    label: "Mi Colección",
    href: "/mycollection",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
      </svg>
    ),
  },
  {
    label: "Grandes Colecciones",
    href: "/collections",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: "Mercados",
    href: "/markets",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    label: "Favoritos",
    href: "/favorites",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    label: "Ajustes",
    href: "/settings",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    label: "Buzón",
    href: "/inbox",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
];

export default function Home() {
  const { user, profileCompleted, stats, coinOfDay, badges, unreadMessages } = useLoaderData<typeof loader>();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <main className="min-h-screen text-[#F2ECE0] flex flex-col items-center justify-center px-4 sm:px-6">
      {!profileCompleted && (
        <ProfileSetupModal defaultName={user.name ?? ""} email={user.email} />
      )}
      {/* Hamburger button */}
      <button
        onClick={() => setDrawerOpen(true)}
        className="fixed top-4 left-4 z-30 flex flex-col gap-[5px] p-2 rounded-lg border border-[rgba(210,180,130,0.2)] bg-[rgba(20,17,16,0.7)] backdrop-blur-sm hover:border-[rgba(210,180,130,0.4)] hover:bg-[rgba(201,164,106,0.1)] transition-colors"
        aria-label="Abrir menú"
      >
        <span className="block w-5 h-[1.5px] bg-[#C9A46A]" />
        <span className="block w-5 h-[1.5px] bg-[#C9A46A]" />
        <span className="block w-5 h-[1.5px] bg-[#C9A46A]" />
      </button>

      {/* Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed left-0 top-0 h-full w-[85vw] max-w-72 z-50 flex flex-col bg-[rgba(14,11,10,0.97)] border-r border-[rgba(210,180,130,0.18)] backdrop-blur-md transition-transform duration-300 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Close button */}
        <button
          onClick={() => setDrawerOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-md text-[rgba(242,236,224,0.45)] hover:text-[#C9A46A] hover:bg-[rgba(201,164,106,0.1)] transition-colors"
          aria-label="Cerrar menú"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Profile section */}
        <div className="px-5 pt-8 pb-6 border-b border-[rgba(210,180,130,0.18)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full border border-[rgba(210,180,130,0.35)] bg-[rgba(201,164,106,0.1)] flex items-center justify-center text-[#C9A46A] text-lg font-semibold flex-shrink-0" style={{ fontFamily: "var(--font-display)" }}>
              {user.name?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[#F2ECE0] truncate" style={{ fontFamily: "var(--font-display)" }}>
                {user.name}
              </p>
              <p className="text-xs text-[rgba(242,236,224,0.45)] mt-0.5" style={{ fontFamily: "var(--font-mono)" }}>
                @coleccionista
              </p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
          {drawerItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-[rgba(242,236,224,0.75)] hover:bg-[rgba(201,164,106,0.1)] hover:text-[#C9A46A] transition-colors text-sm"
            >
              <span className="flex-shrink-0 text-[rgba(201,164,106,0.7)]">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.href === "/inbox" && unreadMessages > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#C9A46A] text-[#0E0B0A] text-[10px] font-bold flex items-center justify-center">
                  {unreadMessages}
                </span>
              )}
            </a>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-2">
          <Form method="post" action="/auth/logout">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[rgba(242,236,224,0.55)] hover:bg-[rgba(201,164,106,0.1)] hover:text-[#C9A46A] transition-colors text-sm"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Cerrar sesión
            </button>
          </Form>
        </div>

        {/* Footer branding */}
        <div className="px-5 py-4 border-t border-[rgba(210,180,130,0.12)] flex items-center gap-2 text-[rgba(242,236,224,0.25)]">
          <span className="text-base">🪙</span>
          <span className="text-[10px] uppercase tracking-[0.2em]" style={{ fontFamily: "var(--font-mono)" }}>
            Album de Monedas
          </span>
        </div>
      </div>

      {/* Page content */}
      <div className="mb-4 flex items-center gap-3 text-[#C9A46A]">
        <span className="text-4xl leading-none">🪙</span>
        <span
          className="text-xs font-medium uppercase tracking-[0.25em]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Album de Monedas
        </span>
      </div>
      <p className="mb-12 text-sm text-[rgba(242,236,224,0.55)]">
        Bienvenido, {user.name}
      </p>
      <div className="grid grid-cols-1 gap-3 w-full max-w-3xl mb-10 sm:grid-cols-3">
        <div className="rounded-xl border border-[rgba(210,180,130,0.2)] bg-[rgba(20,17,16,0.85)] px-4 py-4 sm:py-5 text-center">
          <p className="text-2xl font-semibold text-[#C9A46A]">{stats.total}</p>
          <p className="text-[10px] uppercase tracking-widest text-[rgba(242,236,224,0.4)] mt-1">piezas</p>
        </div>
        <div className="rounded-xl border border-[rgba(210,180,130,0.2)] bg-[rgba(20,17,16,0.85)] px-4 py-4 sm:py-5 text-center">
          <p className="text-2xl font-semibold text-[#C9A46A]">
            {stats.estimatedValue > 0 ? `$${stats.estimatedValue.toLocaleString("es-AR")}` : "—"}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-[rgba(242,236,224,0.4)] mt-1">valor est.</p>
        </div>
        <div className="rounded-xl border border-[rgba(210,180,130,0.2)] bg-[rgba(20,17,16,0.85)] px-4 py-4 sm:py-5 text-center">
          <p className="text-2xl font-semibold text-[#C9A46A]">{stats.topCondition ?? "—"}</p>
          <p className="text-[10px] uppercase tracking-widest text-[rgba(242,236,224,0.4)] mt-1">condición top</p>
        </div>
      </div>
      {coinOfDay && (
        <div className="w-full max-w-3xl mb-8 rounded-xl border border-[rgba(210,180,130,0.25)] bg-[rgba(20,17,16,0.85)] px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[rgba(242,236,224,0.4)] mb-1">
              Moneda del día
            </p>
            <p className="text-sm font-medium text-[#F2ECE0]">{coinOfDay.nombre}</p>
            <p className="text-xs text-[rgba(242,236,224,0.5)] mt-0.5">
              {coinOfDay.denominacion} · {coinOfDay.anio} · {coinOfDay.serie ?? "Sin serie"}
            </p>
          </div>
          <a
            href="/mycollection"
            className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-[rgba(210,180,130,0.3)] text-[#C9A46A] hover:bg-[rgba(201,164,106,0.12)] transition-colors"
          >
            ¿La tenés?
          </a>
        </div>
      )}
      <BadgesGrid badges={badges} />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 w-full max-w-3xl">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="relative flex items-center justify-center rounded-xl border border-[rgba(210,180,130,0.25)] bg-[rgba(20,17,16,0.85)] text-[#C9A46A] h-32 sm:h-40 px-4 text-center text-2xl font-semibold backdrop-blur-md transition-colors hover:bg-[rgba(201,164,106,0.12)] hover:border-[rgba(210,180,130,0.45)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {item.label}
            {item.href === "/inbox" && unreadMessages > 0 && (
              <span className="absolute top-3 right-3 min-w-[18px] h-[18px] px-1 rounded-full bg-[#C9A46A] text-[#0E0B0A] text-[10px] font-bold flex items-center justify-center">
                {unreadMessages}
              </span>
            )}
          </a>
        ))}
      </div>
    </main>
  );
}
