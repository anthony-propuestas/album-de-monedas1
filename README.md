# Album de Monedas

Red social MVP para coleccionistas de monedas (numismática) — stack 100% Cloudflare.

## Stack

- **Frontend**: Remix v2 (Vite) · Tailwind CSS v4 · shadcn/ui (@base-ui/react) → Cloudflare Pages
- **Auth**: remix-auth + remix-auth-google · sesiones en cookie HttpOnly (`__session`, 30 días)
- **Infra**: Cloudflare Pages + Pages Functions (`functions/[[path]].ts`)

> **Roadmap (pendiente):** D1 (SQLite/Drizzle) · Durable Objects (chat) · R2 + Cloudflare Images · KV · WAF · Turnstile

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
| `/home` | Dashboard protegido (requiere sesión) |

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
  components/ui/
    button.tsx                # Button shadcn/ui
  lib/
    auth.server.ts            # createAuth(): Authenticator + GoogleStrategy + cookieStorage
    utils.ts                  # cn() — merge de clases Tailwind
  types/
    env.d.ts                  # Env interface
functions/
  [[path]].ts                 # Entry point Cloudflare Pages Functions
```

## Notas

- Alias de imports: `~/` apunta a `app/`
- Instalar con `npm install --legacy-peer-deps` (conflicto wrangler vs @remix-run/dev)
- React 19 requerido (React 18 tiene conflictos CJS/ESM con Vite SSR)
