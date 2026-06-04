# Gestión de Datos — Album de Monedas

## Stack de datos

| Capa | Servicio | Binding | Qué guarda |
|------|----------|---------|------------|
| Base de datos relacional | Cloudflare D1 (SQLite) | `DB` | Usuarios, monedas, badges, posts, mensajes |
| Archivos binarios | Cloudflare R2 | `IMAGES` | Fotos de monedas (JPEG 512×512) |
| Sesión de usuario | Cookie HttpOnly firmada | `__session` | ID de usuario, email, nombre, foto |
| Catálogo de monedas | Módulos TypeScript estáticos | — | Lista de monedas por país (compilados en bundle) |

Acceso en loaders/actions:

```ts
const db = context.cloudflare.env.DB;       // D1Database
const r2 = context.cloudflare.env.IMAGES;   // R2Bucket | undefined
```

---

## Base de datos D1

**Configuración en `wrangler.toml`:**

```toml
[[d1_databases]]
binding = "DB"
database_name = "album-monedas-db"
database_id = "0789c17d-50e6-4ce4-8acf-f8e308093136"
```

Migraciones en `migrations/` — se aplican con `wrangler d1 migrations apply`.

### Tablas

#### `users` — `migrations/0001_create_users.sql`

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | TEXT PK | ID de Google OAuth |
| `email` | TEXT UNIQUE NOT NULL | Del perfil OAuth |
| `name` | TEXT NOT NULL | Del perfil OAuth |
| `picture` | TEXT | URL de foto de Google |
| `country` | TEXT | País del coleccionista (formulario de perfil) |
| `collecting_since` | TEXT | Año desde que colecciona |
| `goals` | TEXT | Objetivos del coleccionista |
| `profile_completed` | INTEGER DEFAULT 0 | 0 = mostrar `ProfileSetupModal`, 1 = ya completado |
| `created_at` | INTEGER | Unix timestamp (`unixepoch()`) |

#### `coins` — `migrations/0002_create_coins.sql` + `0005_market.sql`

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | TEXT PK | UUID v4 generado en servidor |
| `user_id` | TEXT NOT NULL | FK → `users.id` ON DELETE CASCADE |
| `name` | TEXT NOT NULL | Nombre de la moneda (≤ 200 chars) |
| `country` | TEXT | Código ISO (ej. `"AR"`) |
| `year` | INTEGER | Año de acuñación |
| `denomination` | TEXT | Valor nominal |
| `condition` | TEXT | Estado: `MS / AU / XF / VF / F / VG / G / P` |
| `mint` | TEXT | Casa de acuñación |
| `catalog_ref` | TEXT | Referencia de catálogo externo |
| `estimated_value` | REAL | Valor estimado en USD |
| `notes` | TEXT | Notas libres (≤ 1000 chars) |
| `photo_obverse` | TEXT | Clave R2 de foto anverso |
| `photo_reverse` | TEXT | Clave R2 de foto reverso |
| `photo_edge` | TEXT | Clave R2 de foto canto |
| `photo_detail` | TEXT | Clave R2 de foto detalle |
| `for_sale` | INTEGER DEFAULT 0 | 1 = en venta en marketplace |
| `asking_price` | REAL | Precio pedido (USD) |
| `registry_match` | INTEGER DEFAULT 0 | 1 = moneda verificada contra catálogo oficial (habilita claim onchain) |
| `created_at` | INTEGER | Unix timestamp |

Índices: `idx_coins_user(user_id)`, `idx_coins_country(user_id, country)`, `idx_coins_year(user_id, year)`

#### `user_badges` — `migrations/0003_create_user_badges.sql`

| Columna | Tipo | Notas |
|---------|------|-------|
| `user_id` | TEXT NOT NULL | FK → `users.id` ON DELETE CASCADE |
| `badge_id` | TEXT NOT NULL | ID del badge (ver sección Badges) |
| `unlocked_at` | INTEGER | Unix timestamp |

PK compuesta: `(user_id, badge_id)`. Índice: `idx_badges_user(user_id)`.

#### `posts` — `migrations/0004_create_posts.sql`

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | INTEGER PK AUTOINCREMENT | — |
| `title` | TEXT NOT NULL | Título de la nota |
| `body` | TEXT NOT NULL | Cuerpo en texto plano |
| `created_at` | INTEGER | Unix timestamp |

Tabla mínima; usada por `/news` y `/news/:id`.

#### `messages` — `migrations/0006_create_messages.sql`

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | TEXT PK | UUID v4 |
| `coin_id` | TEXT NOT NULL | Referencia a la moneda en venta |
| `seller_id` | TEXT NOT NULL | FK → `users.id` (vendedor) |
| `buyer_id` | TEXT NOT NULL | FK → `users.id` (comprador) |
| `buyer_name` | TEXT NOT NULL | Nombre de contacto del comprador |
| `buyer_email` | TEXT NOT NULL | Email de contacto |
| `buyer_contact` | TEXT | Contacto adicional (opcional) |
| `message` | TEXT NOT NULL | Cuerpo del mensaje |
| `created_at` | INTEGER | Unix timestamp |
| `read_at` | INTEGER | Unix timestamp; NULL = no leído |

Índices: `idx_messages_seller(seller_id, created_at DESC)`, `idx_messages_buyer(buyer_id)`.

#### `claim_requests` — `migrations/0007_create_claim_requests.sql`

Solicitudes de claim de recompensa onchain. El flujo es: el usuario solicita → admin aprueba → el usuario obtiene firma EIP-712 → reclama en el contrato `RewardClaimer` en Base Sepolia.

| Columna | Tipo | Notas |
|---------|------|-------|
| `id` | TEXT PK | UUID v4 |
| `user_id` | TEXT NOT NULL | FK → `users.id` |
| `coin_id` | TEXT NOT NULL | FK → `coins.id` |
| `coin_registry_key` | TEXT NOT NULL | `country\|denomination\|name\|year` — clave del catálogo |
| `coin_id_hash` | TEXT NOT NULL | keccak256 del registry_key (bytes32 hex) — usado en el contrato |
| `wallet_address` | TEXT NOT NULL | Wallet EVM del usuario (lowercase) |
| `status` | TEXT NOT NULL | `pending` / `approved` / `rejected` / `claimed` / `expired` |
| `reviewed_at` | INTEGER | Unix timestamp de revisión admin (nullable) |
| `approved_at` | INTEGER | Unix timestamp de aprobación (nullable) |
| `expires_at` | INTEGER | Unix timestamp de expiración de firma — 7 días desde aprobación (nullable) |
| `reject_reason` | TEXT | Motivo del rechazo visible al usuario (nullable) |
| `created_at` | INTEGER | Unix timestamp de creación |
| `claimed_at` | INTEGER | Unix timestamp de cuando el usuario confirmó la TX (nullable) |
| `tx_hash` | TEXT | Hash de la TX onchain de claim (nullable) |

Constraint UNIQUE: `(coin_id, status)` para `pending` y `approved` — evita solicitudes duplicadas activas.

### Relaciones

```
users (1) ──< coins (N)           via coins.user_id
users (1) ──< user_badges (N)     via user_badges.user_id
users (1) ──< messages (N)        via messages.seller_id o buyer_id
users (1) ──< claim_requests (N)  via claim_requests.user_id
coins (1) ──< messages (N)        via messages.coin_id
coins (1) ──< claim_requests (N)  via claim_requests.coin_id
```

### Patrón de acceso

Todas las queries usan parámetros posicionales — nunca interpolación de strings:

```ts
const coin = await db
  .prepare("SELECT * FROM coins WHERE id = ? AND user_id = ?")
  .bind(coinId, userId)
  .first<Coin>();
```

---

## Imágenes (R2)

**Configuración en `wrangler.toml`:**

```toml
[[r2_buckets]]
binding = "IMAGES"
bucket_name = "album-monedas-images"
```

### Flujo de upload

```
Cliente (ImageCropEditor)
  └─ canvas 512×512 px, JPEG calidad 92%
       └─ POST multipart/form-data a /mycollection (action)
            ├─ Validación tamaño: ≤ 5 MB por archivo
            ├─ Validación magic bytes: FF D8 FF (JPEG válido)
            ├─ Content-Type forzado a "image/jpeg" (no se confía en file.type)
            └─ PUT a R2 con clave: {userId}/{coinId}/{slot}
                 └─ Clave guardada en coins.photo_* (TEXT)
```

Slots disponibles: `photo_obverse`, `photo_reverse`, `photo_edge`, `photo_detail`.

Ejemplo de clave: `usr_abc123/c9d4e5f6-…/photo_obverse`

### Flujo de serving

Ruta `app/routes/images.$.tsx` maneja `/images/*`:

```
GET /images/{clave-r2}
  └─ Loader lee clave de params
       └─ r2.get(key)
            └─ Response con object.body
                 ├─ Content-Type: del metadata R2
                 └─ Cache-Control: public, max-age=31536000, immutable
```

No requiere autenticación — las claves son UUIDs no predecibles.

---

## Textos y validaciones

### Límites por campo

| Entidad | Campo | Límite | Validación |
|---------|-------|--------|-----------|
| `coins` | `name` | 200 chars | trim + length check en action |
| `coins` | `notes` | 1000 chars | trim + length check en action |
| `coins` | `condition` | enum | validado contra `["MS","AU","XF","VF","F","VG","G","P"]` |
| `users` | `name` | — | trim + not empty |
| `users` | `goals` | — | trim + not empty |

### Enumerables validados

**Condición de moneda** (escala Sheldon numérica simplificada):

| Valor | Nombre |
|-------|--------|
| `MS` | Mint State — sin circulación |
| `AU` | About Uncirculated |
| `XF` | Extremely Fine |
| `VF` | Very Fine |
| `F` | Fine |
| `VG` | Very Good |
| `G` | Good |
| `P` | Poor |

**Slugs de categorías sociales** — validados contra whitelist en `/collections/:category`:

`most_coins`, `most_valuable`, `complete_series`, `argentina`, `international`, `oldest_coins`, `newest_coins`, `best_condition`

### Catálogo estático de monedas

Ubicación: `app/lib/coins/` — datos compilados en el bundle, sin fetch en runtime.

```ts
// Estructura de cada entrada
interface CoinEntry {
  pais: string;
  denominacion: string;
  nombre: string;
  anio: number;
  casa_acunacion: string;
  serie?: string;
}

// Mapa por país
COINS_BY_COUNTRY["AR"]  // Monedas de Argentina
```

Usos: dropdowns en cascada al agregar moneda, cálculo de `seriesProgress` en `mycollection` loader, y lógica de badges.

---

## Sesiones y autenticación

**Cookie:** `__session` — HttpOnly, SameSite=Lax, Secure en producción, 30 días.  
Firmada con `SESSION_SECRET` (HMAC). No accesible desde JavaScript cliente.

**Contenido de la sesión** (datos del perfil OAuth Google):

```ts
{
  id: string;      // Google user ID
  email: string;
  name: string;
  picture: string; // URL de avatar de Google
}
```

### Flujo OAuth Google

```
POST /auth/google
  └─ (opcional) Verifica token Turnstile CAPTCHA
       └─ authenticator.authenticate("google", request)
            └─ Redirige a Google OAuth consent screen

GET /auth/google/callback
  └─ Google devuelve authorization code
       └─ Intercambio por access_token + perfil
            └─ Upsert en tabla users (INSERT OR REPLACE)
                 └─ Sesión creada → redirect /home
```

**Logout:**

```
POST /auth/logout
  └─ sessionStorage.destroySession()
       └─ redirect /
```

### Rutas protegidas

| Ruta | Protección |
|------|-----------|
| `/home`, `/mycollection`, `/collections/*`, `/collection/:userId`, `/markets`, `/inbox`, `/news` | `isAuthenticated(request)` — redirige a `/` si no hay sesión |
| `/admin` | Sesión + `user.email === ADMIN_EMAIL` |
| `/images/:key` | Sin autenticación |
| `/`, `/auth/google`, `/auth/google/callback` | Públicas |

---

## Badges

Definidos estáticamente en `app/lib/badges.ts`, calculados en el loader de `/home`.

| ID | Nombre | Condición |
|----|--------|-----------|
| `first_piece` | Primera pieza | ≥ 1 moneda |
| `decade_collector` | Coleccionista de épocas | ≥ 3 años distintos |
| `arborist` | Arborista | Moneda de serie "Árboles de la República Argentina" |
| `historian` | Historiador | Moneda de serie "Conmemorativa" |
| `top_condition` | Impecable | Al menos una moneda en estado MS o AU |
| `complete_series` | Serie completa | Completó una serie entera del catálogo AR |

Los badges desbloqueados se insertan en `user_badges`. La función `computeEarnedBadgeIds(coins)` recalcula qué badges le corresponden al usuario en cada visita a `/home`.

---

## Variables de entorno

Definidas en `.dev.vars` (local) y en el dashboard de Cloudflare Pages (producción).

| Variable | Tipo | Descripción |
|----------|------|-------------|
| `GOOGLE_CLIENT_ID` | string | OAuth app de Google Cloud |
| `GOOGLE_CLIENT_SECRET` | string | Secret del OAuth app |
| `SESSION_SECRET` | string | Clave HMAC para firmar cookies |
| `ADMIN_EMAIL` | string | Email con acceso a `/admin` |
| `TURNSTILE_SECRET_KEY` | string? | Clave server de Cloudflare Turnstile (opcional) |
| `TURNSTILE_SITE_KEY` | string? | Clave client de Cloudflare Turnstile (opcional) |
| `BACKEND_SIGNER_KEY` | string? | Clave privada EVM (0x…) del firmante backend — genera firmas EIP-712 para claims onchain (secret en Cloudflare) |

---

## Estado: implementado vs pendiente

| Feature | Estado | Nota |
|---------|--------|------|
| D1 (SQLite) | Implementado | 6 migraciones, todas las tablas operativas |
| R2 (imágenes) | Implementado | Upload con validación, serving con cache |
| OAuth Google + sesiones | Implementado | Cookie HttpOnly, 30 días |
| Protección de rutas | Implementado | `isAuthenticated()` en todos los loaders privados |
| Badges | Implementado | 6 badges calculados dinámicamente |
| Marketplace (listado) | Implementado | `for_sale`, `asking_price`, UI en `markets.tsx` |
| Mensajes (tabla) | Implementado | Tabla `messages` creada y con índices |
| Rewards onchain (backend) | Implementado | Tabla `claim_requests`, endpoints `/api/rewards/*`, `/admin/rewards/*`, firma EIP-712 vía `viem` |
| Rate limiting (D1) | Implementado | `checkRateLimit` en `app/lib/rateLimit.server.ts` — ventana por usuario+acción en tabla `rate_limits` |
| Mensajes (Durable Objects) | Pendiente | Chat en tiempo real no implementado |
| Cloudflare Images | Pendiente | Transformaciones/resizing — usar R2 directo por ahora |
| KV | Pendiente | No usado |
| WAF | Pendiente | Activar en dashboard Cloudflare |
