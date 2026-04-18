# Album de Monedas — Instrucciones para Claude

## Proyecto
Red social MVP para coleccionistas de monedas (numismática).

## Stack
- **Frontend**: Next.js 14 App Router · Tailwind CSS · shadcn/ui → Cloudflare Pages
- **Backend**: Cloudflare Workers (API serverless)
- **DB**: Cloudflare D1 (SQLite) + Drizzle ORM
- **Auth**: NextAuth.js · Google OAuth · Cloudflare KV (sesiones)
- **Chat en tiempo real**: Cloudflare Durable Objects (WebSockets)
- **Imágenes**: Cloudflare R2 (storage) + Cloudflare Images (optimización)
- **Seguridad**: Cloudflare WAF · CDN · Turnstile

## Reglas
- Responde siempre en español informal (tú)
- Código y nombres de variables en inglés
- Prioriza free tiers / bajo costo
- Usa solo el stack definido arriba; avisa antes de proponer alternativas
