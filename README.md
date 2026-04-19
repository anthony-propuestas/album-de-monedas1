# Album de Monedas

Red social MVP para coleccionistas de monedas (numismática).

## Stack actual

- **Frontend**: Remix v2 (Vite) · Tailwind CSS v4 · shadcn/ui (@base-ui/react) → Cloudflare Pages
- **Auth**: remix-auth · Google OAuth · sesiones en cookie (`__session`)
- **Infraestructura**: Cloudflare Pages + Pages Functions

> **Roadmap (pendiente):** D1 (SQLite/Drizzle) · Durable Objects (chat) · R2 + Cloudflare Images · KV · WAF · Turnstile

## Variables de entorno

Crea `.dev.vars` en la raíz para desarrollo local:

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
SESSION_SECRET=...
```

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/` | Landing pública con botón de login |
| `/auth/google` | Inicia flujo OAuth con Google (action POST) |
| `/auth/google/callback` | Callback de Google OAuth (loader) |
| `/home` | Dashboard protegido (requiere sesión) |

## Desarrollo local

```bash
npm run dev
```

## Despliegue en Cloudflare Pages

```bash
# Preview local con Wrangler
npm run preview

# Deploy
npm run deploy
```
