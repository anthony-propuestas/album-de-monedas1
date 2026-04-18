# Album de Monedas

Red social MVP para coleccionistas de monedas (numismática).

## Stack

- **Frontend**: Next.js 15 · Tailwind CSS · shadcn/ui → Cloudflare Pages
- **Backend**: Cloudflare Workers
- **DB**: Cloudflare D1 (SQLite) + Drizzle ORM
- **Auth**: NextAuth.js · Google OAuth · Cloudflare KV
- **Chat**: Cloudflare Durable Objects (WebSockets)
- **Imágenes**: Cloudflare R2 + Cloudflare Images

## Desarrollo local

```bash
npm run dev
```

## Despliegue en Cloudflare Pages

```bash
# Build para Cloudflare
npm run pages:build

# Preview local con Wrangler
npm run preview

# Deploy
npm run deploy
```

> Cada route handler que use APIs de Node.js debe exportar `export const runtime = 'edge'`.
