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
- **Auth**: NextAuth.js · Google OAuth · Cloudflare KV (sesiones)
- **DB**: Cloudflare D1 (SQLite) + Drizzle ORM
- **Chat**: Cloudflare Durable Objects (WebSockets)
- **Imágenes**: Cloudflare R2 + Cloudflare Images
- **Seguridad**: Cloudflare WAF · Turnstile (anti-bot)

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
  root.tsx              # Layout: <html dark>, fuentes Geist, Outlet
  globals.css           # Tokens shadcn/ui + @import tailwindcss
  entry.client.tsx      # Hydration React en browser
  entry.server.tsx      # SSR con renderToReadableStream (Cloudflare)
  routes/
    _index.tsx          # Landing pública: Hero + "Cómo funciona"
  components/ui/
    button.tsx          # Button shadcn/ui
  lib/
    utils.ts            # cn() — merge de clases Tailwind
functions/
  [[path]].ts           # Entry point Cloudflare Pages Functions
public/                 # Assets estáticos
vite.config.ts          # Remix plugin + Tailwind v4 plugin + tsconfigPaths
wrangler.toml           # Config Cloudflare Pages (output: build/client)
```

## Routing en Remix

- Rutas en `app/routes/`. Convenciones: `_index.tsx` = `/`, `coins._index.tsx` = `/coins`
- Data loading: exportar `loader` (server) y `action` (mutations) por archivo de ruta
- No hay Server Components — todo es loader/action + componente React clásico
