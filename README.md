# Album de Monedas

Red social MVP para coleccionistas de monedas (numismática) — stack 100% Cloudflare.

## Stack

- **Frontend**: Remix v2 (Vite) · Tailwind CSS v4 · shadcn/ui (@base-ui/react) → Cloudflare Pages
- **Auth**: remix-auth + remix-auth-google · sesiones en cookie HttpOnly (`__session`, 30 días)
- **Infra**: Cloudflare Pages + Pages Functions (`functions/[[path]].ts`)

> **Implementado:** D1 (SQLite) · Autenticación Google OAuth · Perfil de usuario · R2 (imágenes de monedas) · Colección personal con galería y filtros
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
    images.$.tsx              # loader proxy → sirve imágenes desde R2 con Cache-Control inmutable
  components/
    ui/button.tsx             # Button shadcn/ui
    ProfileSetupModal.tsx     # Modal de configuración de perfil
    AddCoinModal.tsx          # Modal multipart: 4 slots de foto + datos numismáticos + preview cliente
    CoinCard.tsx              # Tarjeta de galería: foto anverso, nombre, país/año, badge de condición
    CoinFilters.tsx           # Barra de filtros: búsqueda, país, año, condición (URL search params)
  lib/
    auth.server.ts            # createAuth(): Authenticator + GoogleStrategy + cookieStorage
    countries.ts              # Lista de países para formularios
    utils.ts                  # cn() — merge de clases Tailwind
  types/
    env.d.ts                  # Env interface (DB: D1Database, IMAGES?: R2Bucket)
functions/
  [[path]].ts                 # Entry point Cloudflare Pages Functions
migrations/
  0001_create_users.sql       # Tabla users: id, email, name, picture, country, collecting_since, goals, profile_completed
  0002_create_coins.sql       # Tabla coins: id, user_id, name, country, year, denomination, condition, mint, catalog_ref, estimated_value, notes, photo_*
```

## Notas

- Alias de imports: `~/` apunta a `app/`
- Instalar con `npm install --legacy-peer-deps` (conflicto wrangler vs @remix-run/dev)
- React 19 requerido (React 18 tiene conflictos CJS/ESM con Vite SSR)
