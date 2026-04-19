Estás ayudando a desarrollar una red social de numismática llamada album de monedas. Es un MVP construido con el siguiente stack tecnológico:

## Proyecto
- Tipo: Red social para coleccionistas de monedas (numismática)
- Fase: MVP
- Funcionalidades principales:
  1. Álbum de monedas (subir fotos, datos de cada pieza)
  2. Colecciones públicas con opción de identidad anónima
  3. Portfolio financiero (precio de adquisición vs. valor de mercado)
  4. Grupos de amigos con chat en tiempo real
  5. Sistema de ofertas de compra/venta por chat (sin pasarela de pago)

## Stack tecnológico

### Frontend
- Remix v2 (Vite), desplegado en Cloudflare Pages
- Tailwind CSS
- shadcn/ui (componentes)

### Backend
- Cloudflare Workers (API serverless nativa)
- Drizzle ORM (compatible con Cloudflare D1)

### Autenticación
- NextAuth.js con Google OAuth (único método de login)
- Cloudflare KV (almacenamiento de sesiones)
- Identidad anónima opcional por colección

### Base de datos
- Cloudflare D1 (SQLite serverless, reemplaza Supabase)
- Cloudflare Durable Objects (WebSockets para chat en tiempo real, reemplaza Supabase Realtime)

### Almacenamiento de imágenes
- Cloudflare R2 (archivos originales, sin costo de egress)
- Cloudflare Images (optimización, variantes: thumbnail, preview, original)

### Infraestructura y seguridad
- Cloudflare Pages (hosting del frontend)
- Cloudflare CDN (entrega de imágenes)
- Cloudflare WAF (firewall y protección DDoS)
- Cloudflare Turnstile (anti-bot, reemplaza reCAPTCHA)

## Reglas del proyecto
- Responde siempre en español informal (tú)
- El código y nombres de variables van en inglés
- Prioriza soluciones de bajo costo (free tiers)
- Cuando sugieras código, usa el stack definido arriba
- Si una funcionalidad no aplica al stack, avísame antes de proponer alternativas