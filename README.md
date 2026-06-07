# Album de Monedas

Red social MVP para coleccionistas de monedas (numismática) — stack 100% Cloudflare.

## Stack

- **Frontend**: Remix v2 (Vite) · Tailwind CSS v4 · shadcn/ui (@base-ui/react) → Cloudflare Pages
- **Auth**: remix-auth + remix-auth-google · sesiones en cookie HttpOnly (`__session`, 30 días)
- **Infra**: Cloudflare Pages Advanced Mode (`worker.ts` → `build/client/_worker.js`) · `functions/[[path]].ts` solo para dev local

> **Implementado:** D1 (SQLite) · Autenticación Google OAuth · Perfil de usuario · R2 (imágenes de monedas) · Colección personal con galería y filtros · Dropdowns en cascada por país con módulos de datos de monedas · Sección social /collections con rankings por categoría y vistas públicas de colecciones · Stats públicas en landing · Rewards onchain (claim de recompensas en Base Mainnet vía EIP-712) · Mapas coropletas D3 (colección personal + colección colaborativa onchain) · Chat global (D1) · Turnstile (anti-bot en login, condicional por env)
> **Pendiente:** Durable Objects (chat en tiempo real) · KV · WAF

## Variables de entorno

Crea `.dev.vars` en la raíz para desarrollo local:

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SESSION_SECRET=...
ADMIN_EMAIL=...
BACKEND_SIGNER_KEY=0x...
# Opcionales
# TURNSTILE_SITE_KEY=...
# TURNSTILE_SECRET_KEY=...
```

## Comandos

```bash
npm run dev          # desarrollo local (puerto 5173)
npm run build        # build para producción
npm run typecheck    # verificar tipos TypeScript
npm run preview      # preview local con Wrangler
npm run deploy       # build + deploy a Cloudflare Pages
npm run test         # tests en modo watch
npm run test:run     # tests en modo single-pass (CI)
npm run test:coverage # tests con reporte de cobertura
```

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/` | Landing pública: navbar fija con login · Hero · Álbum Colaborativo + Recompensas Onchain · stats · "¿Por qué?" · "Cómo funciona" |
| `/auth/google` | Inicia flujo OAuth con Google (action POST) |
| `/auth/google/callback` | Callback de Google OAuth (loader) |
| `/auth/logout` | Cierra sesión y limpia la cookie (action POST) |
| `/home` | Dashboard protegido: menú lateral + stats personales (piezas, valor estimado, condición top) + modal de configuración de perfil |
| `/mycollection` | Colección personal: galería filtrable + formulario para agregar piezas |
| `/full-collection` | Vista completa de la colección propia con todos los filtros (protegida) |
| `/collections` | Ranking social: grid de 8 categorías en orden aleatorio por visita |
| `/collections/:category` | Top 10 coleccionistas de una categoría (most-pieces, oldest, highest-value…) |
| `/collection/:userId` | Colección pública de otro usuario (read-only, con filtros) |
| `/images/*` | Proxy de imágenes almacenadas en R2 (loader, sin auth — claves son UUIDs) |
| `/news` | Feed de noticias numismáticas |
| `/news/:id` | Artículo de noticias individual |
| `/markets` | Marketplace de monedas en venta |
| `/inbox` | Mensajería / notificaciones |
| `/admin` | Panel de administración: lista de noticias (con delete), mantenimiento de registry_match (requiere ADMIN_EMAIL) |
| `/admin/new-news` | Formulario para crear nueva noticia (requiere ADMIN_EMAIL) |
| `/admin/rewards` | Panel admin: lista de claims pendientes para aprobar o rechazar (loader) |
| `/admin/rewards/:id/approve` | Aprobar un claim — genera ventana de 7 días para reclamar (action POST) |
| `/admin/rewards/:id/reject` | Rechazar un claim con motivo (action POST) |
| `/api/rewards/request` | Solicitar claim de recompensa onchain para una moneda verificada (action POST) |
| `/api/rewards/sign` | Obtener firma EIP-712 para reclamar la recompensa aprobada (action POST) |
| `/api/rewards/status/:coinId` | Estado actual del claim de una moneda (loader GET) |
| `/api/rewards/claimed` | Registrar una recompensa como reclamada después de la tx onchain (action POST) |

## Arquitectura

```
app/
  root.tsx                    # Layout: <html dark>, Outlet wrappado en <Providers>
  globals.css                 # Tokens shadcn/ui + @import tailwindcss
  entry.client.tsx            # Hydration React en browser
  entry.server.tsx            # SSR con renderToReadableStream (Cloudflare)
  routes/
    _index.tsx                # Landing pública
    auth.google.tsx           # action POST → inicia OAuth Google
    auth.google.callback.tsx  # loader → callback OAuth, redirige a /home
    auth.logout.tsx           # action → logout + clear session cookie
    home.tsx                  # Dashboard protegido: loader con 3 queries en paralelo + grid de stats + nav cards
    admin.tsx                 # Panel de administración: lista de noticias (delete) + fix_registry_match + links a /admin/new-news y /admin/rewards
    admin_.new-news.tsx       # Formulario para crear nueva noticia (loader + action) → /admin/new-news
    mycollection.tsx          # loader (galería filtrable) + action (add_coin: sube fotos a R2, inserta en D1)
    collections._index.tsx    # loader → 8 queries en paralelo, shuffle Fisher-Yates, grid de tiles
    collections.$category.tsx # loader → valida slug, top 10 de la categoría con stat formateada
    collection.$userId.tsx    # loader → perfil público + colección ajena read-only con filtros
    images.$.tsx              # loader proxy → sirve imágenes desde R2 con Cache-Control inmutable
    news.tsx                  # Feed de noticias numismáticas
    news.$id.tsx              # Artículo de noticias individual
    markets.tsx               # Marketplace de monedas en venta
    inbox.tsx                 # Mensajería / notificaciones
    api.rewards.request.tsx   # action POST → solicitar claim de recompensa onchain (límite: 3 req/h)
    api.rewards.sign.tsx      # action POST → obtener firma EIP-712 para reclamar (límite: 5 req/h)
    api.rewards.status.$coinId.tsx  # loader GET → estado del claim de una moneda
    api.rewards.claimed.tsx   # action POST → marcar claim como reclamado tras tx onchain
    admin_.rewards.tsx        # loader → panel admin de claims pendientes
    admin.rewards.$id.approve.tsx   # action → aprobar claim (expira en 7 días)
    admin.rewards.$id.reject.tsx    # action → rechazar claim con motivo
    full-collection.tsx       # loader → vista completa de colección propia con filtros
  components/
    ui/button.tsx             # Button shadcn/ui
    ui/CustomSelect.tsx       # Select accesible para dropdowns en cascada
    ProfileSetupModal.tsx     # Modal de configuración de perfil
    AddCoinModal.tsx          # Modal multipart: 4 slots de foto + editor de recorte + dropdowns en cascada
    ImageCropEditor.tsx       # Editor circular: drag-to-pan, zoom, crop via Canvas 512×512 → JPEG
    CoinCard.tsx              # Tarjeta de galería: foto anverso circular, nombre, país/año, badge de condición
    CoinDetailModal.tsx       # Modal detalle de moneda
    CoinFilters.tsx           # Barra de filtros: búsqueda, país, año, condición (URL search params)
    CategoryTile.tsx          # Tile de categoría: icono, título, descripción, preview del #1, link a ranking
    CollectorRow.tsx          # Fila de ranking: medalla (🥇🥈🥉/#N), avatar, nombre → /collection/:userId, stat
    BadgesGrid.tsx            # Grid de logros del usuario
    SeriesProgress.tsx        # Progreso de una serie numismática
    YearTimeline.tsx          # Timeline de monedas por año
    AdminRewardsPanel.tsx     # Panel admin: lista claims pendientes con detalle completo (fotos anverso/reverso, condición, ref. catálogo, valor estimado, notas, registry key); botones aprobar/rechazar
    ClaimButton.tsx           # Botón de claim de recompensa onchain (conecta wallet + ejecuta tx)
    WalletConnectButton.tsx   # Conexión/desconexión de wallet en el header de /mycollection
    DeleteConfirmModal.tsx    # Modal de confirmación para eliminar una moneda
    EditCoinModal.tsx         # Modal edición de moneda existente; pre-rellena campos; permite reemplazar fotos; bloqueado si hay claim activo
    WorldMap.tsx              # Mapa coropleta SVG (D3 + TopoJSON) — client-only, color blue/amber según uso
    ui/__tests__/
      button.test.tsx             # 18 tests: variantes, tamaños, onClick, disabled, buttonVariants
    __tests__/
      AddCoinModal.test.tsx       # 37 tests: render/flujo de fotos + cascada (selects, opciones, reset)
      AdminRewardsPanel.test.tsx  # 21 tests: nombre, denominación, país/año, fotos obverso/reverso, condición, ceca, ref. catálogo, valor estimado, notas, empty state, aprobar/rechazar, modal de rechazo
      CategoryTile.test.tsx       # 11 tests: link, título, descripción, sin datos, topName/stat/picture, iconos
      ClaimButton.test.tsx        # 13 tests: registry_match guard, estados del claim, fetch POST
      CoinCard.test.tsx           # 12 tests: foto placeholder/img, rounded-full, estimated_value
      CoinDetailModal.test.tsx    # 18 tests: render, datos opcionales, galería de fotos, cierre
      CoinFilters.test.tsx        # 7 tests: inputs de búsqueda, selects de país/condición, prefill
      CollectorRow.test.tsx       # 16 tests: medallas, link con/sin ?from=, avatar, stat
      ImageCropEditor.test.tsx    # 9 tests: zoom, crop vía canvas, cancelar/confirmar
      ProfileSetupModal.test.tsx  # 14 tests: goals, validación, submit state, inputs ocultos
      WorldMap.test.tsx           # 5 tests: render, title, leyenda piezas (singular/plural), sin monedas
      WalletConnectButton.test.tsx # 5 tests: conectar/desconectar wallet, display de address truncada
      EditCoinModal.test.tsx      # 21 tests: render, pre-relleno, fotos existentes, flujo de crop, submit state
  providers/
    WagmiProvider.tsx         # wagmi (Base Mainnet) + TanStack Query
    __tests__/
      WagmiProvider.test.tsx      # 2 tests: render sin crash, provee contexto wagmi
  lib/
    auth.server.ts            # createAuth(): Authenticator + GoogleStrategy + cookieStorage
    countries.ts              # Lista de países para formularios
    utils.ts                  # cn() — merge de clases Tailwind
    collections.ts            # CATEGORIES (8 categorías con SQL + statLabel) + getCategoryBySlug
    badges.ts                 # Sistema de logros/badges
    rewards.server.ts         # getCoinIdHash, signClaim, isCoinClaimedOnchain (viem / Base Mainnet)
    rateLimit.server.ts       # checkRateLimit — rate limiting por usuario+acción en D1
    country-numeric-map.ts    # NUMERIC_TO_ALPHA2: ISO numeric → alpha-2 para conectar world-atlas con los códigos de la DB
    coins/
      index.ts                # CoinEntry interface + COINS_BY_COUNTRY: Record<string, CoinEntry[]>
      argentina.ts            # MONEDAS_ARGENTINA — Serie 1, Serie 2 (Árboles) y conmemorativas
    contracts/
      abi.ts                  # ABI del contrato RewardClaimer (claimReward, coinClaimed, lastClaimTime)
      addresses.ts            # Addresses de AlbumCoin y RewardClaimer en Base Mainnet
    __tests__/
      auth.server.test.ts         # 7 tests: createAuth, authenticator, sessionStorage, callbackURL
      coins.test.ts               # 15 tests: integridad del registro y datos de MONEDAS_ARGENTINA
      collections.test.ts         # 25 tests: CATEGORIES, getCategoryBySlug, statLabel × 8 categorías
      countries.test.ts           # 8 tests: lista ISO, unicidad de códigos/nombres, entradas específicas
      rateLimit.server.test.ts    # 7 tests: checkRateLimit — límite, bloqueo, retryAfter, params D1
      rewards.server.test.ts      # 8 tests: getCoinIdHash, signClaim, isCoinClaimedOnchain
      utils.test.ts               # 8 tests: cn() — clases vacías, concatenación, falsy, conflictos Tailwind
  routes/
    __tests__/
      _index.loader.test.ts             # 5 tests: loader landing — stats de DB, sin auth
      _index.test.tsx                   # 18 tests: render landing — hero, stats, secciones
      admin.action.test.ts              # 14 tests: delete post, fix registry_match, auth guard
      admin.loader.test.ts              # 7 tests: loader admin — lista posts, auth guard
      admin_.new-news.test.ts           # 11 tests: loader + action nueva noticia, validación, auth
      admin_.rewards.test.ts            # 4 tests: loader panel de claims pendientes
      admin.rewards.id.approve.test.ts  # 4 tests: action aprobar claim, ventana 7 días
      admin.rewards.id.reject.test.ts   # 5 tests: action rechazar claim, motivo
      api.rewards.claimed.test.ts       # 5 tests: action marcar claim como reclamado
      api.rewards.request.test.ts       # 10 tests: action solicitar claim onchain
      api.rewards.sign.test.ts          # 7 tests: action firma EIP-712
      api.rewards.status.coinId.test.ts # 5 tests: loader estado del claim
      auth.google.callback.test.ts      # 5 tests: loader callback OAuth
      auth.google.test.ts               # 5 tests: loader null + action POST OAuth
      collection.userId.loader.test.ts  # 11 tests: loader colección pública ajena
      collections.category.loader.test.ts # 7 tests: loader top 10 por categoría
      collections.loader.test.ts        # 9 tests: loader rankings — 8 queries en paralelo, shuffle
      home.action.test.ts               # 13 tests: action dashboard — update perfil
      home.component.test.tsx           # 14 tests: render dashboard, ProfileSetupModal visibility
      home.loader.test.ts               # 19 tests: loader dashboard — stats, auth redirect
      images.$.test.ts                  # 7 tests: loader proxy R2, Cache-Control, 404
      mycollection.action.test.ts       # 9 tests: action add_coin — upload R2, insert D1
      mycollection.loader.test.ts       # 16 tests: loader colección propia — galería, filtros
  types/
    env.d.ts                  # Env interface (DB: D1Database, IMAGES?: R2Bucket, BACKEND_SIGNER_KEY?)
functions/
  [[path]].ts                 # Entry point Cloudflare Pages Functions (dev local)
worker.ts                     # Entry point Cloudflare Pages (Advanced Mode) → _worker.js
scripts/
  build-worker.mjs            # esbuild: compila worker.ts → build/client/_worker.js
  deploy.mjs                  # deploy helper: renombra functions/ temporalmente para Advanced Mode
  create-chat-table.mjs       # crea tabla chat_messages en D1 (ejecutar antes de desplegar chat)
migrations/
  0001_create_users.sql       # Tabla users
  0002_create_coins.sql       # Tabla coins (fotos, condición, valor)
  0003_create_user_badges.sql # Tabla user_badges
  0004_create_posts.sql       # Tabla posts (noticias)
  0005_market.sql             # Columnas for_sale, asking_price en coins
  0006_create_messages.sql    # Tabla messages (marketplace)
  0007_fix_messages_fks.sql   # Recrea messages con FK constraints (ON DELETE CASCADE)
  0008_rate_limits.sql        # Tabla rate_limits (rate limiting por usuario+acción)
  0009_create_claim_requests.sql   # Tabla claim_requests + columna registry_match en coins
  0009b_only_claim_requests.sql   # Tabla claim_requests (alternativa sin registry_match en coins)
  0010_create_chat_messages.sql   # Tabla chat_messages (chat global)
```

## Dropdowns en cascada

El formulario "Nueva pieza" usa dropdowns dependientes cuando el país seleccionado tiene un módulo de datos (`COINS_BY_COUNTRY[country]`). La cadena de selección es:

**País → Denominación → Nombre → Año** → `Ceca` (autorrellena, solo lectura)

Si el país no tiene módulo de datos, los campos vuelven a ser inputs de texto libre.

Para agregar un nuevo país:
1. Crear `app/lib/coins/<pais>.ts` con un array `CoinEntry[]`
2. Importarlo en `app/lib/coins/index.ts` y asignarlo: `COINS_BY_COUNTRY["XX"] = MONEDAS_XX`

## Tests

```bash
npm run test           # ejecutar todos los tests (watch mode)
npm run test:run       # single pass (sin watch)
npm run test:coverage  # reporte de cobertura en /coverage
```

Stack: **Vitest** + **@testing-library/react** + **happy-dom**

45 suites en total. Ver `Docs/test.md` para la lista y descripción completa de cada suite.

## Seguridad

Ver `Docs/security.md` para el análisis completo: autenticación, sesiones, queries parametrizadas, superficie de ataque y checklist de producción.

## Notas

- Alias de imports: `~/` apunta a `app/`
- Instalar con `npm install --legacy-peer-deps` (conflicto wrangler vs @remix-run/dev)
- React 19 requerido (React 18 tiene conflictos CJS/ESM con Vite SSR)
