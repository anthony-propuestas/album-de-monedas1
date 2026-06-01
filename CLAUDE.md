# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

Red social MVP para coleccionistas de monedas (numismática) — stack 100% Cloudflare.

## Comandos

```bash
npm run dev          # desarrollo local (puerto 5173)
npm run build        # build para producción
npm run typecheck    # verificar tipos TypeScript
npm run preview      # preview local con Wrangler
npm run deploy       # build + deploy a Cloudflare Pages
```

## Stack

- **Frontend**: Remix v2 (Vite) · Tailwind CSS v4 · shadcn/ui (@base-ui/react) → Cloudflare Pages
- **Auth**: remix-auth + remix-auth-google · sesiones en cookie HttpOnly (`__session`, 30 días)
- **DB**: D1 (SQLite) · raw SQL vía `db.prepare().bind()` (sin Drizzle)
- **Storage**: R2 (imágenes de monedas)
- **Infra**: Cloudflare Pages + Pages Functions (`functions/[[path]].ts`)

> **Pendiente de implementar:** Drizzle ORM · Durable Objects (chat) · KV · WAF

## Bindings Cloudflare

```toml
[[ d1_databases ]]
binding = "DB"        # database: album-monedas-db

[[ r2_buckets ]]
binding = "IMAGES"    # bucket: album-monedas-images
```

## DB Schema

- `users`: id, name, picture, collecting_since
- `coins`: id, user_id, country, year, denomination, condition, estimated_value, created_at

## Reglas

- Código y variables en inglés; respuestas en español informal (tú)
- Prioriza free tiers de Cloudflare
- Alias de imports: `~/` apunta a `app/` (no `@/`)
- shadcn/ui usa `@base-ui/react` (v4 del CLI, no Radix UI)
- Instalar con `npm install --legacy-peer-deps` (conflicto opcional de wrangler vs @remix-run/dev)
- React 19 requerido — React 18 tiene conflictos CJS/ESM con Vite SSR
- `vite.config.ts` debe mantenerse simple (sin `ssr.resolve.conditions` ni `ssr.noExternal`) para que el dev server funcione

## Arquitectura

```
app/
  root.tsx                      # Layout: <html dark>, Outlet
  globals.css                   # Tokens shadcn/ui + @import tailwindcss
  entry.client.tsx              # Hydration React en browser
  entry.server.tsx              # SSR con renderToReadableStream (Cloudflare)
  routes/
    _index.tsx                  # Landing pública: Hero + "Cómo funciona" + login
    auth.google.tsx             # action POST → inicia OAuth Google
    auth.google.callback.tsx    # loader → callback OAuth, redirige a /home
    auth.logout.tsx             # action → logout + clear session cookie
    home.tsx                    # Dashboard protegido (requiere sesión)
    admin.tsx                   # Panel de administración
    mycollection.tsx            # Colección propia del usuario autenticado
    collection.$userId.tsx      # Colección pública de un usuario
    collections._index.tsx      # Ranking de coleccionistas por categorías (D1)
    collections.$category.tsx   # Detalle de categoría/ranking
    images.$.tsx                # Upload y crop de imágenes → R2
    news.tsx                    # Feed de noticias numismáticas
    news.$id.tsx                # Artículo de noticias individual
    markets.tsx                 # Precios de mercado de monedas
    inbox.tsx                   # Mensajería / notificaciones
  components/
    ui/button.tsx               # Button shadcn/ui
    AddCoinModal.tsx            # Modal agregar moneda a colección
    BadgesGrid.tsx              # Grid de logros del usuario
    CategoryTile.tsx            # Tile de categoría en rankings
    CoinCard.tsx                # Tarjeta de moneda
    CoinDetailModal.tsx         # Modal detalle de moneda
    CoinFilters.tsx             # Filtros de búsqueda de monedas
    CollectorRow.tsx            # Fila de coleccionista en ranking
    ImageCropEditor.tsx         # Editor de recorte de imagen
    ProfileSetupModal.tsx       # Modal setup inicial de perfil
    SeriesProgress.tsx          # Progreso de una serie numismática
    YearTimeline.tsx            # Timeline de monedas por año
  lib/
    auth.server.ts              # createAuth(): Authenticator + GoogleStrategy + cookieStorage
    badges.ts                   # Sistema de logros/badges
    coins/index.ts              # Catálogo de monedas
    coins/argentina.ts          # Datos de monedas de Argentina
    collections.ts              # Queries D1 para rankings y colecciones
    countries.ts                # Datos de países
    utils.ts                    # cn() — merge de clases Tailwind
  types/
    env.d.ts                    # Env interface + AppLoadContext (GOOGLE_*, SESSION_SECRET, TURNSTILE_*)
functions/
  [[path]].ts                   # Entry point Cloudflare Pages Functions
public/                         # Assets estáticos
vite.config.ts                  # Remix plugin + Tailwind v4 plugin + tsconfigPaths
wrangler.toml                   # Config Cloudflare Pages + D1 + R2 bindings
.dev.vars                       # Variables de entorno locales (no commitear)
```

## Routing en Remix

- Rutas en `app/routes/`. Convenciones: `_index.tsx` = `/`, `coins._index.tsx` = `/coins`
- Data loading: exportar `loader` (server) y `action` (mutations) por archivo de ruta
- No hay Server Components — todo es loader/action + componente React clásico
