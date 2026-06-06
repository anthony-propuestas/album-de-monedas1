# Plan de Mejoras de Seguridad

Stack: Cloudflare Pages · Remix v2 · D1 (SQLite) · R2 · viem/wagmi · TypeScript

Cada mejora incluye: qué es, por qué importa, dónde se aplica, y un ejemplo concreto de cómo se implementaría. Ordenadas de mayor a menor prioridad.

---

## 1. Rate limiting en endpoints de rewards `[ALTA]` ✅ APLICADO

**Archivo:** `app/routes/api.rewards.request.tsx`, `app/routes/api.rewards.sign.tsx`

**Qué es el problema:**  
Ninguno de los dos endpoints llama a `checkRateLimit`. Un usuario autenticado puede hacer spam ilimitado de solicitudes de claim, saturar la cola de revisión del admin y forzar múltiples lecturas RPC al contrato en Base Mainnet.

**Por qué importa:**  
- `api.rewards.request` dispara una lectura onchain (`isCoinClaimedOnchain`) en cada request — spam costoso.
- `api.rewards.sign` entrega firmas EIP-712 — sin límite, un bug en el flujo cliente podría solicitar docenas de firmas por minuto.

**Dónde está la función ya implementada:**  
`app/lib/rateLimit.server.ts` → `checkRateLimit(db, userId, action, maxCount, windowHours)`

Firma exacta:
```ts
checkRateLimit(db: D1Database, userId: string, action: string, maxCount: number, windowHours: number)
// → { allowed: boolean, remaining: number, retryAfterSeconds: number }
```
Usa la tabla `rate_limits` en D1 con un upsert atómico — compatible con Cloudflare D1 free tier.

**Cómo se aplica:**  
En `api.rewards.request.tsx`, justo después de obtener `user`, antes de cualquier query a coins:
```ts
const rl = await checkRateLimit(db, user.id, "rewards_request", 3, 1); // 3 por hora
if (!rl.allowed) return json({ error: "Demasiadas solicitudes" }, { status: 429 });
```

En `api.rewards.sign.tsx`, misma posición:
```ts
const rl = await checkRateLimit(db, user.id, "rewards_sign", 5, 1); // 5 por hora
if (!rl.allowed) return json({ error: "Demasiadas solicitudes" }, { status: 429 });
```

**Compatibilidad:** ✅ La función ya existe y usa D1 con el binding `DB` que ambas rutas ya reciben via `context.cloudflare.env`.

---

## 2. Validar formato de `walletAddress` con regex `[MEDIA]`

**Archivo:** `app/routes/api.rewards.request.tsx` (línea 58, antes del INSERT)

**Qué es el problema:**  
El campo `walletAddress` que llega en el body JSON solo recibe `.toLowerCase()`. No se verifica que sea una dirección Ethereum válida. Cualquier string arbitrario (vacío, con HTML, con caracteres especiales) queda almacenado en `claim_requests.wallet_address` y luego se incluye como parámetro `wallet` en la firma EIP-712.

**Por qué importa:**  
- Una dirección malformada en la firma EIP-712 haría que el contrato rechace la transacción, pero el claim queda en estado `pending` consumiendo recursos del admin.
- Datos sucios en la tabla `claim_requests` dificultan auditorías.

**Cómo se aplica:**  
Agregar validación antes del INSERT:
```ts
const ETH_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;
if (!ETH_ADDRESS_REGEX.test(walletAddress)) {
  return json({ error: "Dirección de wallet inválida" }, { status: 400 });
}
```

**Compatibilidad:** ✅ JS nativo, sin dependencias. No requiere viem ni ninguna librería externa (aunque viem exporta `isAddress()` si se prefiere algo más idiomático).

---

## 3. Re-verificar `walletAddress` del body contra la DB en `/api/rewards/sign` `[MEDIA]`

**Archivo:** `app/routes/api.rewards.sign.tsx`

**Situación actual (código en línea 32):**  
```ts
if (claim.wallet_address !== walletAddress.toLowerCase()) return json({ error: "Wallet no coincide" }, { status: 403 });
```
La query de la línea 22 ya trae `wallet_address` de `claim_requests` y lo compara con el body — esto **ya mitiga el vector principal**. Sin embargo, la query no filtra por `user_id`:
```sql
WHERE coin_id = ? AND status = 'approved'
```

**Qué falta:**  
Un usuario autenticado puede sondear si cualquier `coinId` arbitrario tiene un claim aprobado simplemente enviando ese `coinId`. Si el claim existe, recibe 403 (wallet no coincide); si no existe, recibe 404. Esto expone el estado interno de los claims de otros usuarios.

**Cómo se aplica:**  
Agregar `AND user_id = ?` a la query existente:
```sql
WHERE coin_id = ? AND user_id = ? AND status = 'approved'
ORDER BY created_at DESC LIMIT 1
```
Y pasar `user.id` en el `.bind()`.

**Compatibilidad:** ✅ D1 query parametrizada, mismo patrón usado en `api.rewards.request.tsx` (línea 26-27).

---

## 4. ABI encoding en `getCoinIdHash` para eliminar colisiones `[MEDIA]`

**Archivo:** `app/lib/rewards.server.ts` (línea 24)

**Código actual:**
```ts
const registryKey = `${country}|${denomination}|${name}|${year}`;
return keccak256(toHex(registryKey));
```

**Qué es el problema:**  
La concatenación con `|` como separador no es inyectable si ningún campo contiene `|`, pero esto no está garantizado. Si un usuario almacena `denomination = "1|AR"` y `name = "peso"`, el hash es idéntico al de `denomination = "1"` y `name = "AR|peso"`. Dos monedas distintas producirían el mismo `coinIdHash` → el contrato las trataría como la misma moneda.

**Por qué importa:**  
El `coinIdHash` es el identificador onchain de una moneda. Una colisión permitiría que un claim de una moneda bloquee el claim de otra moneda legítima diferente.

**Cómo se aplica:**  
viem ya es dependencia del proyecto (se importa en la misma línea 1 del archivo). La función `encodeAbiParameters` de viem produce encoding determinista sin ambigüedades:
```ts
import { encodeAbiParameters, keccak256 } from "viem";

export function getCoinIdHash(country: string, denomination: string, name: string, year: number) {
  const encoded = encodeAbiParameters(
    [
      { type: "string" },
      { type: "string" },
      { type: "string" },
      { type: "uint256" },
    ],
    [country, denomination, name, BigInt(year)]
  );
  return keccak256(encoded);
}
```

**Importante:** Este cambio produce hashes diferentes a los actuales. Si ya hay claims en producción almacenados con el hash viejo, habrá que migrarlos o regenerarlos. En un MVP sin datos en producción el impacto es nulo.

**Compatibilidad:** ✅ `encodeAbiParameters` ya está disponible en viem (misma versión importada en el archivo).

---

## 5. Sanitizar errores 500 en `api.rewards.request` `[MEDIA]`

**Archivo:** `app/routes/api.rewards.request.tsx` (líneas 62-64)

**Código actual:**
```ts
} catch (e) {
  console.error("[rewards/request]", e);
  return json({ error: String(e) }, { status: 500 });
}
```

**Qué es el problema:**  
`String(e)` puede incluir mensajes internos de viem, stack traces de D1, o información del contrato. En producción esto filtra detalles de implementación al cliente.

**Cómo se aplica:**  
```ts
} catch (e) {
  console.error("[rewards/request]", e);
  return json({ error: "Error interno del servidor" }, { status: 500 });
}
```
El `console.error` ya envía el detalle a Cloudflare Workers Logs — visible en el dashboard de Pages sin exponerlo al cliente.

**Compatibilidad:** ✅ Cambio de una línea, sin dependencias.

---

## 6. Validar `txHash` en `api.rewards.claimed` `[BAJA]`

**Archivo:** `app/routes/api.rewards.claimed.tsx` (línea 10)

**Código actual:**
```ts
const { coinId, txHash } = await request.json<{ coinId: string; txHash: string }>();
```
`txHash` se almacena directamente en `claim_requests.tx_hash` sin validación. Un cliente puede enviar cualquier string.

**Por qué importa:**  
El campo es informativo — no bloquea fondos ni otorga permisos. Pero datos sucios dificultan auditorías y el UPDATE filtra correctamente por `user_id` y `status = 'approved'`, así que el impacto real es bajo.

**Cómo se aplica:**
```ts
const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/;
if (!TX_HASH_REGEX.test(txHash)) {
  return json({ error: "Hash de transacción inválido" }, { status: 400 });
}
```

**Compatibilidad:** ✅ JS nativo.

---

## 7. Loader 405 en `api.rewards.claimed` `[BAJA]`

**Archivo:** `app/routes/api.rewards.claimed.tsx`

**Qué es el problema:**  
El archivo no exporta `loader`. En Remix, una ruta sin `loader` devuelve 200 con el HTML de la app en respuesta a GET — comportamiento inesperado para un endpoint de API pura.

**Cómo se aplica:**  
Agregar al archivo:
```ts
export async function loader() {
  return new Response(null, { status: 405 });
}
```

Los otros dos endpoints de rewards (`api.rewards.request.tsx` y `api.rewards.sign.tsx`) ya tienen este patrón implementado (líneas 7-9 de cada uno).

**Compatibilidad:** ✅ Patrón Remix estándar, ya usado en los otros endpoints del mismo módulo.

---

## 8. Validar `coinId` como UUID en endpoints de rewards `[BAJA]`

**Archivos:** `api.rewards.request.tsx`, `api.rewards.sign.tsx`, `api.rewards.claimed.tsx`

**Qué es el problema:**  
`coinId` llega del body JSON y se pasa directamente a `.bind()` en queries D1. Aunque `.bind()` previene SQL injection, un `coinId` con formato arbitrario puede generar queries que busquen en toda la tabla sin índice efectivo, o simplemente ensuciar los logs.

**Por qué importa:**  
Los IDs de monedas son UUIDs v4 generados con `crypto.randomUUID()` en el servidor. Si el formato no coincide con UUID v4, la query nunca encontrará resultado — es seguro rechazarlo antes del round-trip a D1.

**Cómo se aplica:**  
```ts
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!UUID_REGEX.test(coinId)) {
  return json({ error: "ID de moneda inválido" }, { status: 400 });
}
```

Agregar en los tres endpoints, justo después de extraer `coinId` del body.

**Compatibilidad:** ✅ JS nativo.

---

## 9. Longitud máxima en `mint` y `catalog_ref` `[BAJA]`

**Archivo:** `app/routes/mycollection.tsx` (action `add_coin` y `edit_coin`)

**Qué es el problema:**  
Los campos `mint` y `catalog_ref` no tienen validación de longitud máxima en el servidor. Un cliente puede enviar strings de cientos de miles de caracteres que se almacenarán en D1.

Estado actual de validaciones en mycollection:
- `name`: ✅ máx. 200 chars
- `notes`: ✅ máx. 1000 chars
- `mint`: ❌ sin límite
- `catalog_ref`: ❌ sin límite

**Cómo se aplica:**  
Agregar las mismas validaciones que ya existen para `name`:
```ts
if (mint && mint.trim().length > 200) return json({ error: "mint demasiado largo" }, { status: 400 });
if (catalogRef && catalogRef.trim().length > 200) return json({ error: "catalog_ref demasiado largo" }, { status: 400 });
```

**Compatibilidad:** ✅ Mismo patrón que las validaciones existentes en el mismo action.

---

## 10. Validar `for_sale` y `asking_price` en `add_coin` y `edit_coin` `[BAJA]`

**Archivo:** `app/routes/mycollection.tsx`

**Qué es el problema:**  
El intent `list_coin` sí valida `asking_price` como número, pero `add_coin` y `edit_coin` reciben `for_sale` y `asking_price` sin validar. Un cliente malicioso puede enviar `for_sale = "cualquier cosa"` que llegará a D1.

**Cómo se aplica:**

Para `for_sale` (checkbox → "0" o "1"):
```ts
const forSale = formData.get("for_sale");
const forSaleValue = forSale === "1" ? 1 : 0; // normaliza a 0/1
```

Para `asking_price` (opcional, numérico):
```ts
const rawAskingPrice = formData.get("asking_price");
const askingPrice = rawAskingPrice ? parseFloat(String(rawAskingPrice)) : null;
if (askingPrice !== null && (isNaN(askingPrice) || askingPrice < 0)) {
  return json({ error: "Precio inválido" }, { status: 400 });
}
```

**Compatibilidad:** ✅ JS nativo, mismo patrón que `estimated_value` ya usa `parseFloat`.

---

## 11. Validar `buyer_contact` y longitud de `message` en markets `[BAJA]`

**Archivo:** `app/routes/markets.tsx` (action `contact_seller`)

**Qué es el problema:**

- `buyer_contact` (teléfono/WhatsApp): sin validación de longitud ni formato. Se almacena directamente en `messages.buyer_contact`. Si alguna vista admin lo renderiza sin escaping podría ser un vector XSS.
- `message`: sin límite de longitud a nivel servidor. Solo se valida que no esté vacío.

**Cómo se aplica:**

Para `buyer_contact`:
```ts
if (buyerContact && buyerContact.trim().length > 200) {
  return json({ error: "buyer_contact demasiado largo" }, { status: 400 });
}
```

Para `message`:
```ts
if (message.trim().length > 1000) {
  return json({ error: "Mensaje demasiado largo (máx. 1000 chars)" }, { status: 400 });
}
```

**Compatibilidad:** ✅ Mismo patrón que `notes` en mycollection. React escapa al renderizar, así que el riesgo XSS es bajo, pero el límite de longitud previene abuso del storage en D1.

---

## 12. Headers HTTP de seguridad en `worker.ts` `[MEDIA]`

**Archivo:** `worker.ts`

**Qué es el problema:**  
El worker no agrega ningún header de seguridad HTTP a las respuestas de Remix. Actualmente los headers de seguridad son cero — ni `X-Content-Type-Options`, ni `X-Frame-Options`, ni `Referrer-Policy`.

**Por qué importa:**  
- Sin `X-Content-Type-Options: nosniff`: el browser puede interpretar una respuesta JSON como HTML si el Content-Type es ambiguo.
- Sin `X-Frame-Options: DENY`: la app puede embeberse en un iframe de terceros (clickjacking).
- Sin `Referrer-Policy`: URLs internas (con params de sesión) pueden filtrarse en el header `Referer` de requests a terceros.

**Cómo se aplica:**  
En `worker.ts`, interceptar la respuesta de Remix antes de devolverla:
```ts
const response = await handler(request, { cloudflare: { env, ctx } });
const newHeaders = new Headers(response.headers);
newHeaders.set("X-Content-Type-Options", "nosniff");
newHeaders.set("X-Frame-Options", "DENY");
newHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
return new Response(response.body, {
  status: response.status,
  statusText: response.statusText,
  headers: newHeaders,
});
```

**Nota sobre CSP:**  
Content Security Policy requiere listar los dominios de Google OAuth, Cloudflare Turnstile, y los endpoints RPC de Base. Es la mejora más impactante pero también la más laboriosa de configurar sin romper la app. Se puede agregar inicialmente en modo `report-only` para detectar violaciones antes de enforcearlo.

**Compatibilidad:** ✅ `worker.ts` ya intercepta todas las respuestas de Remix (línea 29). La API `new Headers()` está disponible en el runtime de Cloudflare Workers.

---

## 13. Validar `country` contra whitelist ISO-3166 `[BAJA]`

**Archivo:** `app/routes/mycollection.tsx` (action `add_coin` y `edit_coin`), también `app/routes/home.tsx` (profile setup)

**Qué es el problema:**  
`country` se almacena como string libre sin validar contra ninguna lista de códigos de país. Un usuario puede guardar `country = "<script>alert(1)</script>"` aunque React lo escapa al renderizar.

**Recurso ya disponible en el proyecto:**  
`app/lib/country-numeric-map.ts` exporta `NUMERIC_TO_ALPHA2` — un mapa de ~160 países de ISO 3166-1. Los valores de ese mapa son exactamente los códigos alpha-2 válidos (ej. `"AR"`, `"US"`, `"DE"`).

**Cómo se aplica:**  
```ts
import { NUMERIC_TO_ALPHA2 } from "~/lib/country-numeric-map";

const VALID_COUNTRIES = new Set(Object.values(NUMERIC_TO_ALPHA2));

// En el action:
if (country && !VALID_COUNTRIES.has(country)) {
  return json({ error: "País inválido" }, { status: 400 });
}
```

**Compatibilidad:** ✅ `country-numeric-map.ts` ya existe en el proyecto. El Set se construye una sola vez y la lookup es O(1).

---

## 14. Verificar propiedad de la moneda en `/api/rewards/sign` `[BAJA]`

**Archivo:** `app/routes/api.rewards.sign.tsx` (línea 22)

**Código actual:**
```sql
WHERE coin_id = ? AND status = 'approved'
ORDER BY created_at DESC LIMIT 1
```

**Qué es el problema:**  
La query no filtra por `user_id`. Cualquier usuario autenticado que conozca (o adivine) un `coinId` con claim aprobado puede sondear si ese claim existe y cuál es su estado — recibiendo 403 (wallet no coincide) en lugar de 404. Esto expone información interna de claims ajenos.

**Cómo se aplica:**  
Agregar `AND user_id = ?` al WHERE y pasar `user.id` en el bind:
```sql
WHERE coin_id = ? AND user_id = ? AND status = 'approved'
ORDER BY created_at DESC LIMIT 1
```

La lógica de negocio no cambia — solo se evita la enumeración de estado de claims ajenos.

**Compatibilidad:** ✅ D1 query parametrizada, mismo patrón que `api.rewards.request.tsx` línea 25.

---

## Resumen de implementación

| # | Mejora | Prioridad | Archivos afectados | Esfuerzo estimado |
|---|--------|-----------|-------------------|-------------------|
| 1 | Rate limiting en rewards | ALTA | api.rewards.request, api.rewards.sign | ✅ APLICADO |
| 2 | Validar walletAddress regex | MEDIA | api.rewards.request | 5 min |
| 3 | Verificar wallet en /sign contra DB | MEDIA | api.rewards.sign | ✅ ya implementado — ver nota |
| 4 | ABI encoding en getCoinIdHash | MEDIA | rewards.server.ts | 20 min + migración si hay datos |
| 5 | Sanitizar errores 500 | MEDIA | api.rewards.request | 5 min |
| 6 | Validar txHash | BAJA | api.rewards.claimed | 5 min |
| 7 | Loader 405 en claimed | BAJA | api.rewards.claimed | 5 min |
| 8 | Validar coinId como UUID | BAJA | 3 endpoints de rewards | 10 min |
| 9 | Longitud de mint y catalog_ref | BAJA | mycollection | 5 min |
| 10 | Validar for_sale y asking_price | BAJA | mycollection | 10 min |
| 11 | Validar buyer_contact y message | BAJA | markets | 10 min |
| 12 | Headers HTTP en worker.ts | MEDIA | worker.ts | 15 min |
| 13 | Validar country vs ISO | BAJA | mycollection, home | 10 min |
| 14 | user_id en query de /sign | BAJA | api.rewards.sign | 5 min |

> **Nota sobre la mejora 3:** Al revisar el código actual de `api.rewards.sign.tsx`, la comparación de wallet ya está implementada en línea 32 (`claim.wallet_address !== walletAddress.toLowerCase()`). Lo que falta es la mejora 14 (filtrar por `user_id` para evitar enumeración de claims ajenos).
