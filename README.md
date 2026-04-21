# Album de Monedas

Red social MVP para coleccionistas de monedas (numismática) — stack 100% Cloudflare.

## Stack

- **Frontend**: Remix v2 (Vite) · Tailwind CSS v4 · shadcn/ui (@base-ui/react) → Cloudflare Pages
- **Auth**: remix-auth + remix-auth-google · sesiones en cookie HttpOnly (`__session`, 30 días)
- **Infra**: Cloudflare Pages + Pages Functions (`functions/[[path]].ts`)

> **Implementado:** D1 (SQLite) · Autenticación Google OAuth · Perfil de usuario · R2 (imágenes de monedas) · Colección personal con galería y filtros · Dropdowns en cascada por país con módulos de datos de monedas · Sección social /collections con rankings por categoría y vistas públicas de colecciones
> **Pendiente:** Durable Objects (chat) · KV · WAF · Turnstile

## Variables de entorno

Crea `.dev.vars` en la raíz para desarrollo local:

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SESSION_SECRET=...
```

## Comandos

```bash
npm run dev       # desarrollo local (puerto 5173)
npm run build     # build para producción
npm run typecheck # verificar tipos TypeScript
npm run preview   # preview local con Wrangler
npm run deploy    # build + deploy a Cloudflare Pages
```

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/` | Landing pública: Hero + "Cómo funciona" + login |
| `/auth/google` | Inicia flujo OAuth con Google (action POST) |
| `/auth/google/callback` | Callback de Google OAuth (loader) |
| `/home` | Dashboard protegido: menú lateral + modal de configuración de perfil |
| `/mycollection` | Colección personal: galería filtrable + formulario para agregar piezas |
| `/collections` | Ranking social: grid de 8 categorías en orden aleatorio por visita |
| `/collections/:category` | Top 10 coleccionistas de una categoría (most-pieces, oldest, highest-value…) |
| `/collection/:userId` | Colección pública de otro usuario (read-only, con filtros) |
| `/images/*` | Proxy de imágenes almacenadas en R2 (loader, sin auth — claves son UUIDs) |

## Arquitectura

```
app/
  root.tsx                    # Layout: <html dark>, Outlet
  globals.css                 # Tokens shadcn/ui + @import tailwindcss
  entry.client.tsx            # Hydration React en browser
  entry.server.tsx            # SSR con renderToReadableStream (Cloudflare)
  routes/
    _index.tsx                # Landing pública
    auth.google.tsx           # action POST → inicia OAuth Google
    auth.google.callback.tsx  # loader → callback OAuth, redirige a /home
    home.tsx                  # Dashboard protegido
    mycollection.tsx          # loader (galería filtrable) + action (add_coin: sube fotos a R2, inserta en D1)
    collections._index.tsx    # loader → 8 queries en paralelo, shuffle Fisher-Yates, grid de tiles
    collections.$category.tsx # loader → valida slug, top 10 de la categoría con stat formateada
    collection.$userId.tsx    # loader → perfil público + colección ajena read-only con filtros
    images.$.tsx              # loader proxy → sirve imágenes desde R2 con Cache-Control inmutable
  components/
    ui/button.tsx             # Button shadcn/ui
    ProfileSetupModal.tsx     # Modal de configuración de perfil
    AddCoinModal.tsx          # Modal multipart: 4 slots de foto + editor de recorte + dropdowns en cascada
    ImageCropEditor.tsx       # Editor circular: drag-to-pan, zoom, crop via Canvas 512×512 → JPEG
    CoinCard.tsx              # Tarjeta de galería: foto anverso circular, nombre, país/año, badge de condición
    CoinFilters.tsx           # Barra de filtros: búsqueda, país, año, condición (URL search params)
    CategoryTile.tsx          # Tile de categoría: icono, título, descripción, preview del #1, link a ranking
    CollectorRow.tsx          # Fila de ranking: medalla (🥇🥈🥉/#N), avatar, nombre → /collection/:userId, stat
    __tests__/
      AddCoinModal.test.tsx   # 28 tests: render/flujo de fotos + cascada (selects, opciones, reset)
      CategoryTile.test.tsx   # 19 tests: link, título, descripción, sin datos, topName/stat/picture, iconos
      CollectorRow.test.tsx   # 15 tests: medallas, link con/sin ?from=, avatar, stat
  lib/
    auth.server.ts            # createAuth(): Authenticator + GoogleStrategy + cookieStorage
    countries.ts              # Lista de países para formularios
    utils.ts                  # cn() — merge de clases Tailwind
    collections.ts            # CATEGORIES (8 categorías con SQL + statLabel) + getCategoryBySlug
    coins/
      index.ts                # CoinEntry interface + COINS_BY_COUNTRY: Record<string, CoinEntry[]>
      argentina.ts            # MONEDAS_ARGENTINA — Serie 1, Serie 2 (Árboles) y conmemorativas
    __tests__/
      coins.test.ts           # 14 tests: integridad del registro y datos de MONEDAS_ARGENTINA
      collections.test.ts     # 24 tests: CATEGORIES, getCategoryBySlug, statLabel × 8 categorías
  types/
    env.d.ts                  # Env interface (DB: D1Database, IMAGES?: R2Bucket)
functions/
  [[path]].ts                 # Entry point Cloudflare Pages Functions
migrations/
  0001_create_users.sql       # Tabla users: id, email, name, picture, country, collecting_since, goals, profile_completed
  0002_create_coins.sql       # Tabla coins: id, user_id, name, country, year, denomination, condition, mint, catalog_ref, estimated_value, notes, photo_*
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
npm run test           # ejecutar todos los tests
npm run test:ui        # interfaz visual de Vitest
npm run coverage       # reporte de cobertura
```

Stack: **Vitest** + **@testing-library/react** + **happy-dom**

| Suite | Archivo | Tests |
|-------|---------|-------|
| Módulo de monedas | `app/lib/__tests__/coins.test.ts` | 14 |
| Categorías de ranking | `app/lib/__tests__/collections.test.ts` | 24 |
| AddCoinModal | `app/components/__tests__/AddCoinModal.test.tsx` | 28 |
| CategoryTile | `app/components/__tests__/CategoryTile.test.tsx` | 19 |
| CollectorRow | `app/components/__tests__/CollectorRow.test.tsx` | 15 |
| /collections loader | `app/routes/__tests__/collections.loader.test.ts` | 9 |
| /collections/:category loader | `app/routes/__tests__/collections.category.loader.test.ts` | 13 |
| /collection/:userId loader | `app/routes/__tests__/collection.userId.loader.test.ts` | 11 |

Ver `Docs/test.md` para la descripción completa de cada test.

## Seguridad

Ver `Docs/security.md` para el análisis completo: autenticación, sesiones, queries parametrizadas, superficie de ataque y checklist de producción.

## Notas

- Alias de imports: `~/` apunta a `app/`
- Instalar con `npm install --legacy-peer-deps` (conflicto wrangler vs @remix-run/dev)
- React 19 requerido (React 18 tiene conflictos CJS/ESM con Vite SSR)
