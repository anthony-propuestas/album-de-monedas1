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
- **Infra**: Cloudflare Pages + Pages Functions (`functions/[[path]].ts`)

> **Pendiente de implementar:** D1 (SQLite/Drizzle) · Durable Objects (chat) · R2 + Cloudflare Images · KV · WAF · Turnstile

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
    home.tsx                    # Dashboard protegido (requiere sesión)
  components/ui/
    button.tsx                  # Button shadcn/ui
  lib/
    auth.server.ts              # createAuth(): Authenticator + GoogleStrategy + cookieStorage
    utils.ts                    # cn() — merge de clases Tailwind
  types/
    env.d.ts                    # Env interface (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SESSION_SECRET)
functions/
  [[path]].ts                   # Entry point Cloudflare Pages Functions
public/                         # Assets estáticos
vite.config.ts                  # Remix plugin + Tailwind v4 plugin + tsconfigPaths
wrangler.toml                   # Config Cloudflare Pages (output: build/client)
.dev.vars                       # Variables de entorno locales (no commitear)
```

## Routing en Remix

- Rutas en `app/routes/`. Convenciones: `_index.tsx` = `/`, `coins._index.tsx` = `/coins`
- Data loading: exportar `loader` (server) y `action` (mutations) por archivo de ruta
- No hay Server Components — todo es loader/action + componente React clásico
