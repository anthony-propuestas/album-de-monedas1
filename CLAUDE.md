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
- **Onchain/Wallet**: viem · wagmi · TanStack Query (Base Sepolia)
- **Visualización**: d3-geo · topojson-client · world-atlas (`public/world-110m.json`)
- **Infra**: Cloudflare Pages Advanced Mode (`worker.ts` → `build/client/_worker.js`) · `functions/[[path]].ts` solo para dev local

> **Pendiente de implementar:** Drizzle ORM · Durable Objects (chat) · KV · WAF

## Bindings Cloudflare

```toml
[[ d1_databases ]]
binding = "DB"        # database: album-monedas-db

[[ r2_buckets ]]
binding = "IMAGES"    # bucket: album-monedas-images
```

## DB Schema

- `users`: id, email, name, picture, country, collecting_since, goals, profile_completed, created_at
- `coins`: id, user_id, name, country, year, denomination, condition, mint, catalog_ref, estimated_value, notes, photo_obverse, photo_reverse, photo_edge, photo_detail, for_sale, asking_price, registry_match, created_at
- `claim_requests`: id, user_id, coin_id, coin_registry_key, coin_id_hash, wallet_address, status (pending|approved|rejected|claimed), reviewed_at, approved_at, expires_at, reject_reason, tx_hash, claimed_at, created_at
- `user_badges`: user_id, badge_id, unlocked_at
- `posts`: id, title, body, created_at
- `messages`: id, coin_id, seller_id, buyer_id, buyer_name, buyer_email, buyer_contact, message, created_at, read_at
- `rate_limits`: user_id, action, window_start, count

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
    _index.tsx                  # Landing pública: navbar fija · Hero · Álbum Colaborativo (recompensas onchain) · stats · "¿Por qué?" · "Cómo funciona"
    auth.google.tsx             # action POST → inicia OAuth Google; loader → null (evita 405 en GET *.data); el <Form> en _index usa reloadDocument para no ser interceptado por el SPA
    auth.google.callback.tsx    # loader → callback OAuth, redirige a /home
    auth.logout.tsx             # action → logout + clear session cookie
    home.tsx                    # Dashboard protegido (requiere sesión)
    admin.tsx                   # Panel de administración (lista posts, delete, fix_registry_match)
    admin_.new-news.tsx         # Formulario para crear nueva noticia → /admin/new-news
    mycollection.tsx            # Colección propia del usuario autenticado
    collection.$userId.tsx      # Colección pública de un usuario
    collections._index.tsx      # Ranking de coleccionistas por categorías (D1)
    collections.$category.tsx   # Detalle de categoría/ranking
    images.$.tsx                # Upload y crop de imágenes → R2
    news.tsx                    # Feed de noticias numismáticas
    news.$id.tsx                # Artículo de noticias individual
    markets.tsx                 # Precios de mercado de monedas
    inbox.tsx                   # Mensajería / notificaciones
    api.rewards.request.tsx     # action POST → solicitar claim de recompensa onchain
    api.rewards.sign.tsx        # action POST → obtener firma EIP-712 para reclamar
    api.rewards.status.$coinId.tsx # loader GET → estado del claim de una moneda
    admin_.rewards.tsx          # loader → panel admin de claims pendientes
    admin.rewards.$id.approve.tsx # action → aprobar claim (expira en 7 días)
    admin.rewards.$id.reject.tsx  # action → rechazar claim con motivo
    api.rewards.claimed.tsx     # action POST → marcar claim como reclamado tras tx onchain
    full-collection.tsx         # loader → vista completa de colección propia con filtros
  components/
    ui/button.tsx               # Button shadcn/ui
    ui/CustomSelect.tsx         # Select accesible para dropdowns en cascada
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
    AdminRewardsPanel.tsx       # Panel admin: lista claims pendientes, botones aprobar/rechazar
    ClaimButton.tsx             # Botón de claim onchain; sin wallet conecta MetaMask directamente vía `injected()`; con wallet envía solicitud al admin o ejecuta la TX
    DeleteConfirmModal.tsx      # Modal de confirmación para eliminar una moneda
    WorldMap.tsx                # Mapa coropleta SVG (D3 + TopoJSON) — client-only; props: coinsByCountry (ISO-2 → count), colorScheme ("blue"|"amber"), title
  lib/
    auth.server.ts              # createAuth(): Authenticator + GoogleStrategy + cookieStorage
    badges.ts                   # Sistema de logros/badges
    coins/index.ts              # Catálogo de monedas
    coins/argentina.ts          # Datos de monedas de Argentina
    collections.ts              # Queries D1 para rankings y colecciones
    countries.ts                # Datos de países
    utils.ts                    # cn() — merge de clases Tailwind
    rewards.server.ts           # getCoinIdHash, signClaim, isCoinClaimedOnchain (viem / Base Sepolia)
    rateLimit.server.ts         # checkRateLimit — rate limiting por usuario+acción en D1
    country-numeric-map.ts      # NUMERIC_TO_ALPHA2: mapeo ISO 3166-1 numérico → alpha-2 (~160 países) para conectar world-atlas con los códigos ISO de la DB
    contracts/abi.ts            # ABI del contrato RewardClaimer (claimReward, coinClaimed, lastClaimTime)
    contracts/addresses.ts      # Addresses de AlbumCoin y RewardClaimer en Base Sepolia
  providers/
    WagmiProvider.tsx           # Providers: wagmi (Base Sepolia) + TanStack Query
  types/
    env.d.ts                    # Env interface + AppLoadContext (GOOGLE_*, SESSION_SECRET, TURNSTILE_*, BACKEND_SIGNER_KEY)
functions/
  [[path]].ts                   # Entry point Cloudflare Pages Functions
public/
  world-110m.json               # TopoJSON Natural Earth 110m (~100KB) — usado por WorldMap para generar paths SVG de países
vite.config.ts                  # Remix plugin + Tailwind v4 plugin + tsconfigPaths
wrangler.toml                   # Config Cloudflare Pages + D1 + R2 bindings
.dev.vars                       # Variables de entorno locales (no commitear)
worker.ts                       # Entry point Cloudflare Pages (Advanced Mode) → _worker.js
scripts/
  build-worker.mjs              # esbuild: compila worker.ts → build/client/_worker.js; stubPlugin reemplaza paquetes browser-only (wagmi, WalletConnect…) con exports vacíos en el Worker SSR
  deploy.mjs                    # deploy helper: renombra functions/ temporalmente para evitar errores de Pages Functions en Advanced Mode
```

## Routing en Remix

- Rutas en `app/routes/`. Convenciones: `_index.tsx` = `/`, `coins._index.tsx` = `/coins`
- Data loading: exportar `loader` (server) y `action` (mutations) por archivo de ruta
- No hay Server Components — todo es loader/action + componente React clásico
