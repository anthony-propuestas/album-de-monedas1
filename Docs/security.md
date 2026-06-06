# Seguridad — Album de Monedas

Estado actual: MVP con autenticación Google OAuth funcional, base de datos D1 (perfil de usuario + colección de monedas) y almacenamiento de imágenes en R2.

---

## Autenticación

### Flujo OAuth Google

1. El usuario hace POST a `/auth/google` (form de Remix).
2. `remix-auth` redirige al servidor de Google con los scopes `openid email profile`, especificados explícitamente en la configuración de `GoogleStrategy` (`app/lib/auth.server.ts`).
3. Google redirige a `/auth/google/callback` con el authorization code.
4. El servidor intercambia el code por tokens, extrae el perfil y crea la sesión.
5. El usuario queda redirigido a `/home`.

### Sesión

- **Mecanismo**: cookie HttpOnly firmada (`__session`) via `createCookieSessionStorage`.
- **Duración**: 30 días (`maxAge: 2592000`).
- **Flags**:
  - `httpOnly: true` — inaccesible desde JavaScript del navegador.
  - `sameSite: "lax"` — protege contra CSRF en navegación entre sitios.
  - `secure: true` en producción — solo enviada por HTTPS.
- **Firmada** con `SESSION_SECRET` (HMAC), lo que impide que el cliente la falsifique.

### Protección de rutas

- `home.tsx` y `mycollection.tsx` llaman a `authenticator.isAuthenticated(request)` tanto en el `loader` como en el `action`, y lanzan `redirect("/")` si no hay sesión.
- Las rutas `/auth/google` y `/auth/google/callback` no requieren sesión.
- `/images/*` (implementado en `app/routes/images.$.tsx`) no requiere sesión: las claves R2 tienen el formato `{userId}/{coinId}/{slot}` donde `coinId` es un UUID v4, haciendo las URLs no adivinables por fuerza bruta.
- `/admin` (implementado en `app/routes/admin.tsx`) y `/admin/new-news` (implementado en `app/routes/admin_.new-news.tsx`) requieren sesión activa **y** que `user.email` coincida con la variable de entorno `ADMIN_EMAIL`; si falla cualquiera de los dos, redirigen a `/`. `/admin/new-news` valida título (no vacío, máx. 200 chars) y cuerpo (no vacío) antes de insertar en D1 con `.bind()`. El `action` de `admin.tsx` también maneja `delete_chat_message`: DELETE parametrizado (`WHERE id = ?`) con validación `Number.isInteger(id) && id > 0` previa al bind, protegido por el mismo guard de email. El loader de `admin.tsx` consulta `chat_messages`; si la migración no se ha ejecutado, la ruta produce 500 (riesgo operativo, no de seguridad).
- `/auth/logout` (implementado en `app/routes/auth.logout.tsx`) solo acepta POST; destruye la sesión con `sessionStorage.destroySession()` y redirige a `/`. El botón de cierre de sesión en el drawer de `/home` usa `<Form method="post" action="/auth/logout">`.
- `collections._index.tsx` (`/collections`), `collections.$category.tsx` (`/collections/:category`) y `collection.$userId.tsx` (`/collection/:userId`) requieren sesión activa; sin ella, redirigen a `/`. Las tres rutas son de **solo lectura** (sin `action`) — no aceptan mutaciones.

---

## Base de datos D1

### Queries parametrizadas

Todas las interacciones con D1 usan el método `.bind()` de la API de D1, que separa la query del dato y previene SQL injection:

```ts
db.prepare("SELECT profile_completed FROM users WHERE id = ?").bind(user.id).first()
db.prepare("INSERT INTO users (id, email, name, picture) VALUES (?, ?, ?, ?)").bind(...).run()
db.prepare("UPDATE users SET name = ?, country = ?, ... WHERE id = ?").bind(...).run()
db.prepare("SELECT * FROM coins WHERE user_id = ?").bind(user.id).all()
db.prepare("INSERT INTO coins (id, user_id, name, ...) VALUES (?, ?, ?, ...)").bind(...).run()
```

El loader de `/home` ejecuta adicionalmente 3 queries de stats en paralelo, todas parametrizadas con `user.id` obtenido de la sesión:

```ts
db.prepare("SELECT COUNT(*) as total FROM coins WHERE user_id = ?").bind(user.id).first()
db.prepare("SELECT COALESCE(SUM(estimated_value), 0) as total FROM coins WHERE user_id = ? AND estimated_value IS NOT NULL").bind(user.id).first()
db.prepare("SELECT condition, COUNT(*) as cnt FROM coins WHERE user_id = ? AND condition IS NOT NULL GROUP BY condition ORDER BY cnt DESC LIMIT 1").bind(user.id).first()
```

Los filtros de búsqueda de `/mycollection` también usan placeholders `?` para cada condición dinámica. Nunca se interpola input del usuario directamente en un string de query.

### Stats personales en `/home`

El dashboard muestra `stats.total`, `stats.estimatedValue` y `stats.topCondition` al usuario autenticado sobre su propia colección.

| Propiedad | Fuente | Datos expuestos | Riesgo |
|-----------|--------|-----------------|--------|
| `stats.total` | `COUNT(*)` filtrado por `user_id` de sesión | Conteo de monedas propias | Ninguno |
| `stats.estimatedValue` | `SUM(estimated_value)` filtrado por `user_id` de sesión | Valor estimado total de monedas propias | Ninguno |
| `stats.topCondition` | `GROUP BY condition` filtrado por `user_id` de sesión | Condición más frecuente en colección propia | Ninguno |
| `claimedByCountry` | JOIN `claim_requests`+`coins` GROUP BY `c.country` — todos los usuarios, sin filtro por `user_id` | Conteo de claims onchain por código ISO-2 (agregado global) | Ninguno — sin PII; requiere auth; análogo a `totalUsers`/`totalCoins` de la landing |

Puntos clave:
- El `user.id` usado en `.bind()` proviene de la cookie de sesión firmada (HMAC), no de input del cliente — sin riesgo de privilege escalation entre usuarios.
- Los datos son estrictamente del propio usuario; no hay cross-user exposure (a diferencia de `/collection/:userId`).
- La ruta sigue requiriendo sesión activa; no amplía la superficie unauthenticated.
- Los valores `null` de la DB se convierten con `?? 0` / `?? null` en el servidor antes de serializar — sin fuga de información de schema.

### Validación de entrada en los actions

- El `action` de `/home` valida que `name`, `country`, `collecting_since` y `goals` sean strings no vacíos (tras `.trim()`) antes de escribir en la DB.
- El `action` de `/mycollection` requiere que `intent === "add_coin"`. El campo `name` se valida que no sea vacío (devuelve 400 si lo es). Se validan longitudes máximas (`name` ≤ 200, `notes` ≤ 1000 chars). `condition` se valida contra el enum `MS/AU/XF/VF/F/VG/G/P`. Los campos opcionales se almacenan como `null` si están vacíos, nunca como string vacío.

### Almacenamiento de imágenes en R2

- La clave de cada imagen es `{userId}/{coinId}/{slot}` — el `coinId` es un UUID v4 generado en el servidor, haciendo las claves no predecibles.
- Antes de subirse, cada foto pasa por el editor `ImageCropEditor`: el navegador la redibuja en un `<canvas>` 512×512 y la exporta con `canvas.toBlob(..., "image/jpeg", 0.92)`. En el flujo normal el archivo que llega al servidor es un JPEG re-encodado, independientemente del formato original (PNG, HEIC, WebP, etc.). El `contentType` enviado a R2 es `file.type` del objeto `File` recibido por el servidor — en el flujo normal coincide con `"image/jpeg"` porque el blob del canvas lleva ese tipo, pero un cliente que bypasee el canvas puede declarar cualquier `Content-Type`.
- El servidor valida magic bytes (FF D8 FF) antes de subir a R2; los archivos que no son JPEG válidos son rechazados. El `contentType` enviado a R2 se fija a `"image/jpeg"` de forma segura en lugar de confiar en `file.type`.
- El servidor rechaza archivos mayores a 5 MB antes de llamar a R2.

### Datos almacenados

**Tabla `users`**

| Campo | Fuente | Riesgo |
|-------|--------|--------|
| `id`, `email`, `name`, `picture` | Token OAuth de Google (servidor) | Bajo — datos verificados por Google |
| `country`, `collecting_since` | Input de formulario | Bajo — validado como no vacío; React escapa al renderizar |
| `goals` | Input de formulario (comma-separated) | Bajo — mismo tratamiento; no se ejecuta como código |
| `profile_completed` | Servidor (siempre `1` en UPDATE) | Ninguno — el cliente no puede enviarlo directamente |

**Tabla `coins`**

| Campo | Fuente | Riesgo |
|-------|--------|--------|
| `id` | `crypto.randomUUID()` en servidor | Ninguno |
| `user_id` | Sesión autenticada (servidor) | Ninguno — el cliente no puede falsificarlo |
| `name`, `denomination`, `mint`, `catalog_ref`, `notes` | Input de formulario | Bajo — React escapa al renderizar; sin ejecución como código |
| `country`, `condition` | Input de formulario | Bajo — `condition` validada contra enum `MS/AU/XF/VF/F/VG/G/P`; `country` libre |
| `year`, `estimated_value` | Input numérico, parseado con `parseInt`/`parseFloat` | Bajo — NaN se convierte en `null` antes de guardar |
| `photo_*` | Clave R2 generada en servidor | Ninguno — el cliente nunca decide el nombre del archivo |

---

## Módulos de datos de monedas y dropdowns en cascada

### Naturaleza de los datos

Los módulos `app/lib/coins/argentina.ts` y `app/lib/coins/index.ts` son **archivos TypeScript estáticos** compilados en el bundle del cliente en tiempo de build. No hay fetch a ninguna API externa, no hay lectura de archivos en runtime y no existe superficie de ataque de inyección de datos externos.

### Validación: cliente vs. servidor

Los dropdowns en cascada (País → Denominación → Nombre → Año → Casa de Acuñación) son **exclusivamente client-side**. El servidor (`action` de `mycollection.tsx`) recibe los campos `denomination`, `name`, `year` y `mint` como strings de un POST multipart ordinario, sin validar su contenido contra los módulos.

**Consecuencia para `mint`:** un atacante puede enviar valores arbitrarios para `mint`, ya que este campo no se valida server-side. Para `denomination` y `name`, el servidor verifica que correspondan a valores del módulo `COINS_BY_COUNTRY[country]` cuando el país existe; si no coinciden devuelve 400.

`condition` se valida contra el enum `MS/AU/XF/VF/F/VG/G/P`. `country` sigue siendo libre (sin validación ISO).

### Riesgos introducidos

Ninguna superficie de ataque nueva. En particular:

- No hay llamadas a APIs externas ni fetches desde el cliente para cargar los datos.
- No se abre ningún endpoint nuevo.
- Los datos de los módulos no pasan por el servidor; son constantes del bundle.
- Las queries D1 del action siguen usando `.bind()` parametrizado — el valor de `mint` autorrelleno llega como string normal y se almacena de la misma forma que antes.

### Riesgo pendiente añadido

| Riesgo | Estado | Mitigación |
|--------|--------|------------|
| Sin validación server-side de `denomination` y `name` contra los módulos | **Implementado** | `denomination` y `name` se validan contra `COINS_BY_COUNTRY[country]` en el action; `mint` sigue siendo libre |

---

## Sección social /collections

### Validación de slug de categoría

`collections.$category.tsx` valida `params.category` contra el array `CATEGORIES` de `app/lib/collections.ts` antes de ejecutar ninguna query. Si el slug no existe en ese array, lanza `new Response("Not Found", { status: 404 })`. Actúa como **whitelist estricta**: solo los 8 slugs conocidos (`most-pieces`, `oldest`, `highest-value`, `most-countries`, `best-condition`, `most-active`, `most-denominations`, `veteran`) pueden disparar una query a D1.

### Queries D1 — todas parametrizadas con `.bind()`

Ningún valor externo se interpola directamente en strings de query:

| Ruta | Queries | Valores en `.bind()` |
|---|---|---|
| `/collections` | 8 aggregate en paralelo | `bind(1)` — LIMIT 1 para preview de tile |
| `/collections/:category` | 1 query del slug validado | `bind(10)` — LIMIT 10 para top 10 |
| `/collection/:userId` | 2 queries | `bind(params.userId)` para perfil; `bind(userId[, q, country, year, condition])` para monedas |

Los filtros opcionales (`q`, `country`, `year`, `condition`) de `/collection/:userId` añaden placeholders `?` al string de query de la misma forma que en `/mycollection`, nunca por interpolación.

### Parámetro `?from=` en la URL

El parámetro `?from={slug}` se lee en el loader de `/collection/:userId` y se devuelve al cliente como string para construir el href del botón "Volver al ranking". No se almacena en D1, no se ejecuta como código y no afecta a ninguna query. Un valor arbitrario solo modifica la URL del botón en el cliente — sin consecuencias de seguridad.

### Exposición de datos entre usuarios

`/collection/:userId` expone la colección de cualquier usuario autenticado a cualquier otro usuario autenticado. Campos visibles: `name`, `country`, `year`, `denomination`, `condition`, `estimated_value`, `notes`, `photo_*`. Esto es intencional (plataforma social), pero implica:

- El `estimated_value` de las monedas de cualquier usuario es visible para todos los usuarios con sesión.
- Las fotos en R2 se sirven via `/images/{key}` sin autenticación (comportamiento preexistente — claves no predecibles por UUID).
- No existe control de privacidad por usuario en el MVP (aceptado).

### Riesgos introducidos

| Riesgo | Estado |
|---|---|
| Slug de categoría no validado → query arbitraria | **Mitigado** — whitelist en `getCategoryBySlug` antes de cualquier query |
| Filtros de `/collection/:userId` sin parametrizar | **Mitigado** — mismo patrón `.bind()` de `/mycollection` |
| Datos de colecciones ajenas accesibles sin consentimiento | Aceptado (MVP) — solo usuarios autenticados; sin control de privacidad por ahora |

---

## Landing pública con stats de D1

### Qué hace

El `loader` de `_index.tsx` ejecuta dos queries `COUNT(*)` contra D1 sin requerir sesión y devuelve `{ totalUsers, totalCoins }` al cliente:

```ts
db.prepare("SELECT COUNT(*) as count FROM users").first()
db.prepare("SELECT COUNT(*) as count FROM coins").first()
```

### Datos expuestos

Solo se exponen **agregados numéricos** — nunca IDs, emails, nombres ni ningún otro campo de las tablas. Un atacante que llame directamente al endpoint solo obtiene dos enteros.

### Superficie unauthenticated hacia D1

Esta es la única ruta de la aplicación que consulta D1 sin sesión activa. Riesgos a considerar:

| Riesgo | Estado |
|--------|--------|
| Exposición de PII | **Ninguna** — queries `COUNT(*)` puras, sin `SELECT` de campos de usuario |
| Scraping de volumen de la plataforma | Aceptado — es información pública por diseño (social proof en landing) |
| Abuso por flood de requests sin auth | Mitigado por Cloudflare Pages (DDoS, rate limiting de red) — sin rate limiting explícito a nivel de aplicación por ahora |

### Sin cambios en la tabla de riesgos conocidos

No se introduce ningún vector nuevo de inyección, privilege escalation ni fuga de datos de usuario. Las queries son parametrizadas con `.bind()` y no reciben ningún input del cliente.

---

## Rutas de contenido y marketplace

### `/news` y `/news/:id`

- **Auth**: sesión requerida en ambas rutas (`authenticator.isAuthenticated` → redirect `/` si no autenticado).
- **Queries**: `SELECT ... FROM posts ORDER BY created_at DESC` sin parámetros (no los necesita); `/news/:id` usa `WHERE id = ?` con `.bind(id)` y valida que el id sea entero positivo antes del bind.
- **Exposición**: solo campos públicos de `posts` (id, title, body, created_at). Sin PII.
- **Sin action**. Sin superficies de ataque adicionales.

### `/inbox`

- **Auth**: sesión requerida.
- **Queries**: `SELECT ... FROM messages WHERE seller_id = ?` y `UPDATE messages SET read_at = ... WHERE seller_id = ? AND read_at IS NULL` — ambas usan `.bind(user.id)`. El `user.id` viene de la sesión, no de input del cliente.
- **Aislamiento**: filtrado estrictamente por `seller_id = user.id` — un usuario solo ve sus propios mensajes recibidos.
- **Sin action**. El UPDATE de marcado como leído es un side-effect del loader, acotado al mismo `user_id`.

### `/markets`

- **Auth**: sesión requerida tanto en loader como en action.
- **Loader**: devuelve todas las monedas con `for_sale = 1` de todos los usuarios — comportamiento público intencional (marketplace). Los filtros de búsqueda (`q`, `country`, `condition`) se construyen dinámicamente pero siempre con `.bind(...values)`.
- **Action (`contact_seller`)**: INSERT en `messages` con 8 parámetros bound. Validaciones: `coin_id` y `seller_id` requeridos, mensaje no vacío, `seller_id ≠ user.id` (no se puede contactar uno mismo). Rate limiting: `checkRateLimit(db, user.id, "contact_seller", 5, 1)` — 5 mensajes por minuto por usuario.
- **Sin superficies adicionales**: `buyer_contact` es opcional y se guarda directamente (no se renderiza como HTML).

### `/full-collection`

- **Auth**: sesión requerida.
- **Queries**: SELECT de una moneda representativa por tipo (country + denomination + name + year) con JOIN a `users`. Filtros opcionales usan `.bind()`. Los filtros de año usan `parseInt(..., 10)` antes del bind — previene inyección.
- **Exposición**: devuelve datos de monedas con owner (nombre, foto) de todos los usuarios — vista global de catálogo, intencional.
- **Sin action**. Sin superficies adicionales.

### Resumen de riesgos

| Ruta | Auth | Isolation | SQL seguro | Rate limit |
|------|------|-----------|------------|------------|
| `/news` | ✅ | N/A | ✅ | ❌ (no aplica) |
| `/news/:id` | ✅ | N/A | ✅ + int check | ❌ (no aplica) |
| `/inbox` | ✅ | ✅ seller_id | ✅ | ❌ (solo lectura) |
| `/markets` loader | ✅ | público intencional | ✅ | ❌ |
| `/markets` action | ✅ | self-contact check | ✅ | ✅ 5/min |
| `/full-collection` | ✅ | público intencional | ✅ + parseInt | ❌ (solo lectura) |

---

## Sistema de Recompensas Onchain

### Mecanismos implementados

- **Autenticación de sesión**: todos los endpoints (`/api/rewards/request`, `/api/rewards/sign`, `/api/rewards/status/:coinId`) exigen sesión activa.
- **Aislamiento por usuario**: `api.rewards.request` verifica `WHERE id = ? AND user_id = ?` — la moneda debe pertenecer al usuario que solicita.
- **Verificación de registro**: solo monedas verificadas pueden iniciar un claim. Tanto el loader de `/mycollection` como `api.rewards.request` verifican en memoria contra `COINS_BY_COUNTRY` — ninguno confía en el valor almacenado en `registry_match` para tomar la decisión de autorización.
- **Double-spend onchain**: antes de crear una solicitud, se consulta `coinClaimed()` en el contrato para evitar duplicados.
- **Firma EIP-712**: el backend firma `{wallet, coinId}` con la clave privada del signer (`BACKEND_SIGNER_KEY`). El dominio incluye `chainId: 8453` (Base Mainnet) y la dirección del contrato para evitar replay cross-chain. Las firmas emitidas en testnet (chainId 84532) son inválidas en mainnet por diseño.
- **BACKEND_SIGNER_KEY en producción**: al operar en Base Mainnet, esta clave firma operaciones con valor real (tokens ERC-20). Debe estar en los env vars de Cloudflare Pages (nunca en el repo) y rotarse si se compromete.
- **Expiración de aprobación**: las aprobaciones admin expiran a los 7 días (`expires_at`), verificado en `api.rewards.sign` antes de entregar la firma.
- **Registro de claim onchain**: `api.rewards.claimed` actualiza el status a `'claimed'` filtrando por `user_id` y `status = 'approved'` — solo el dueño del claim puede marcarlo.
- **Admin protegido por email**: los endpoints `/admin/rewards/*` verifican `user.email === ADMIN_EMAIL`.
- **Datos visibles al admin en revisión de claims**: `admin_.rewards.tsx` incluye en el SELECT `photo_reverse`, `condition`, `mint`, `catalog_ref`, `estimated_value` y `notes` de `coins`. El admin ve el detalle completo de la moneda (incluyendo notas privadas y valoración estimada del usuario) para informar su decisión de aprobación. Acceso exclusivo al email con rol `ADMIN_EMAIL`; no expuesto a otros usuarios.
- **SQL parametrizado**: todas las queries usan `.prepare().bind()`.
- **Error handling en `isCoinClaimedOnchain`** (`rewards.server.ts`): envuelto en try/catch; devuelve `false` si el RPC falla, evitando que la excepción bloquee la acción completa.
- **Error handling global en `api.rewards.request`**: todo el action está envuelto en try/catch; errores inesperados devuelven 500 en lugar de propagarse como excepción no capturada al worker.

### Nuevas superficies de ataque

#### [HIGH] Sin rate limiting en endpoints de rewards
`api.rewards.request` y `api.rewards.sign` no invocan `checkRateLimit` (la función existe en `app/lib/rateLimit.server.ts` pero no se usa aquí). Un usuario autenticado puede hacer spam de solicitudes sin restricción, saturando el flujo de revisión admin y forzando lecturas RPC al contrato.

#### [MEDIUM] La firma EIP-712 no tiene expiración onchain
El backend verifica `claim.expires_at` antes de entregar la firma, pero una vez entregada, la firma es válida onchain indefinidamente hasta que `coinClaimed` sea `true`. Si se detecta fraude después de que el usuario obtiene la firma (pero antes de ejecutar la tx), no hay mecanismo para invalidarla onchain.

#### [MEDIUM] `walletAddress` se almacena sin validación de formato
`api.rewards.request` recibe `walletAddress` del body JSON y solo aplica `.toLowerCase()`. No se verifica que sea una dirección Ethereum válida (`/^0x[0-9a-f]{40}$/i`). Cualquier string arbitrario queda guardado en `claim_requests.wallet_address` y luego es incluido como parámetro en la firma EIP-712.

#### [MEDIUM] Colisión de hash por carácter separador en `getCoinIdHash`
`rewards.server.ts` concatena con `|` sin escapar: `` `${country}|${denomination}|${name}|${year}` ``. Un campo que contenga `|` puede producir el mismo `keccak256` que otra combinación legítima. Ejemplo: `denomination="1|AR"` + `name="peso"` colisiona con `denomination="1"` + `name="AR|peso"`.

#### [MEDIUM] `api.rewards.sign` no re-verifica `walletAddress` del body contra `claim_requests`
El cliente envía `walletAddress` en el body JSON. El servidor no consulta `claim_requests.wallet_address` para verificar que coincidan antes de firmar. La firma EIP-712 incluye el `recipient` enviado por el cliente, por lo que el contrato rechazará la tx si usa la address original del claim para validar — la mitigación real está onchain, no en el servidor. **Corrección pendiente**: `SELECT wallet_address FROM claim_requests WHERE coin_id = ? AND status = 'approved'` y rechazar si el valor del body difiere.

#### [LOW] `api.rewards.sign` no verifica propiedad de la moneda por `user_id`
La query busca `WHERE coin_id = ? AND status = 'approved'` sin filtrar por `user_id`. Cualquier usuario autenticado puede sondear si un `coinId` arbitrario tiene un claim aprobado. El wallet check previene que obtenga una firma útil, pero la información de estado queda expuesta.

#### [MEDIUM] `isCoinClaimedOnchain` falla silenciosamente ante error RPC
El try/catch en `isCoinClaimedOnchain` devuelve `false` si el RPC falla. Esto evita que la acción crashee, pero permite insertar un `claim_request` para una moneda que *podría* ya estar reclamada onchain (si el RPC estaba caído al momento de la verificación). El contrato rechazará la tx en el momento de ejecutar, por lo que el impacto real es operativo (inconsistencia de estado en DB, no pérdida de fondos). Se elimina el riesgo anterior de crash total por RPC no disponible.

#### [LOW] `catch (e)` en `api.rewards.request` expone `String(e)` al cliente
El handler global devuelve `{ error: String(e) }` en respuestas 500. En producción puede filtrar stack traces, mensajes de D1, o información interna de viem si la excepción proviene de esas capas.

#### [LOW] `api.rewards.claimed` — `txHash` no se valida
`api.rewards.claimed.tsx` recibe `txHash` del body JSON y lo almacena directamente en `claim_requests.tx_hash` sin validar que sea un hash de transacción Ethereum válido (`/^0x[0-9a-f]{64}$/i`). No tiene loader que retorne 405 para GET. Impacto bajo: el campo es solo informativo y el UPDATE filtra por `user_id` y `status = 'approved'`.

#### [LOW] Sin mecanismo de revocación de aprobación
El admin puede aprobar un claim pero no existe endpoint para revertirlo. Si se detecta irregularidad entre la aprobación y la ejecución onchain, la única opción es esperar que expire el `expires_at`.

#### [LOW] Admin ve notas privadas y valor estimado durante revisión de claims
`admin_.rewards.tsx` expone `notes` y `estimated_value` de la moneda reclamada al administrador. Comportamiento intencional (mejora la calidad de la revisión); aceptado en MVP. Los usuarios no son informados explícitamente de que sus notas privadas son visibles al admin durante el proceso de aprobación.


### Hardening de infraestructura

- **`worker.ts` asset check**: cambiado de `assetResponse.status !== 404` a `assetResponse.ok`. La versión anterior reenviaba respuestas 5xx y 3xx del asset server al cliente. La versión nueva solo reenvía 2xx, evitando filtrar errores internos de Cloudflare Pages Assets.
- **`worker.ts` routing explícito por pathname**: los paths `/assets/*` y `/favicon*` se cortocircuitan antes del handler de Remix mediante un check de `url.pathname`. Se usa `new Request(request.url)` (sin `request.clone()`) para que las cookies de sesión no se reenvíen al servidor de assets. Si el binding `ASSETS` no está disponible para esas rutas, devuelve 503 en lugar de lanzar excepción.

---

## Componente WorldMap

### Propiedades de seguridad

- **Client-only**: usa `useEffect` para montar; no se ejecuta en SSR, sin exposición server-side.
- **Fetch local**: `fetch("/world-110m.json")` apunta a un asset estático del bundle de Cloudflare Pages — sin URLs externas ni input del usuario en la URL.
- **Sin SVG injection**: los `d` attributes de los `<path>` son generados por `d3-geo`/`topojson-client` a partir del TopoJSON local, no de datos del usuario.
- **Tooltip sin XSS**: `tooltip.name` proviene de `COUNTRY_NAME[iso2]`, un lookup de `app/lib/countries.ts` (constante estática del bundle). `tooltip.count` es un `number`. Ambos se renderizan como texto en JSX (escape automático de React). No se usa `dangerouslySetInnerHTML`.
- **Props de entrada**: `coinsByCountry` es `Record<string, number>` — solo claves ISO-2 y conteos enteros; sin strings arbitrarios del usuario que lleguen al DOM.

### Dependencias nuevas

`d3-geo`, `d3-scale`, `topojson-client` son librerías de visualización de datos ampliamente auditadas, sin dependencias de red en runtime.

---

## Componentes cliente: WalletConnectButton y ClaimButton

### WalletConnectButton

- **Client-only**: `useAccount`/`useConnect`/`useDisconnect` de wagmi — sin comunicación server-side.
- **Display de address seguro**: `truncateAddress()` recorta a 6+4 chars y se renderiza como texto en JSX; React escapa por defecto — sin riesgo de XSS.
- **Sin surface de ataque servidor**: disconnect es un state local; no se emite ningún request al backend.

### ClaimButton

- **Retorna `null` si `!address`**: la responsabilidad de conectar la wallet recae en `WalletConnectButton`; `ClaimButton` no intenta conectar por su cuenta.
- **`wallet_watchAsset` (EIP-747)**: llamada puramente client-side que sugiere importar el token AlbumCoin a la wallet tras un claim exitoso. La address del token (`0xf078c79b0F52ABE81394DD455cBc0a63f76bC059`) está hardcodeada — si AlbumCoin se redespliega esta address debe actualizarse manualmente en el componente.
- **`walletAddress` del cliente no re-verificado en `/api/rewards/sign`**: al ejecutar el claim, `ClaimButton` envía `walletAddress: currentAddress` en el body de `/api/rewards/sign`. El servidor firma sin consultar el `wallet_address` almacenado en `claim_requests`. Vector: un usuario con un claim aprobado puede solicitar la firma para una wallet distinta a la registrada. **Mitigación actual**: la firma EIP-712 incluye el `recipient` enviado por el cliente; si el contrato usa el `wallet_address` original del claim para validar, la firma será inválida onchain. **Mitigación pendiente**: ver tabla de riesgos.

---

## Edición de monedas (`edit_coin`)

### Mecanismos implementados

- **Auth**: mismo guard de sesión que todos los intents del action de `/mycollection`.
- **Propiedad en doble capa**: SELECT inicial `WHERE id=? AND user_id=?` + UPDATE final `WHERE id=? AND user_id=?`. Un usuario no puede editar monedas ajenas aunque conozca el `coin_id`.
- **Claim lock**: rechaza ediciones si existe un `claim_request` activo (`pending|approved|claimed`). Evita que el usuario altere datos de una pieza que el admin ya está revisando.
- **Rate limiting**: 30 ediciones cada 24 h por usuario vía `checkRateLimit("edit_coin", 30, 24)`.
- **Validación de entrada**: `name ≤ 200 chars`, `notes ≤ 1000 chars`; `condition` validado contra enum `MS/AU/XF/VF/F/VG/G/P`; `country` sin validación ISO (pendiente, mismo estado que `add_coin`).
- **Uploads**: magic bytes JPEG (`FF D8 FF`), límite 5 MB, misma lógica que `add_coin`.
- **Limpieza de R2**: borra la key anterior antes de subir la nueva — sin acumulación de archivos huérfanos en R2.
- **Queries parametrizadas**: todas las consultas D1 usan `.prepare().bind()`.

### Sin riesgos nuevos

`edit_coin` es simétrico a `add_coin` en validaciones. No introduce superficies de ataque adicionales respecto a los riesgos ya documentados.

---

## Chat global (`chat_messages`)

### Mecanismos implementados

- **Escritura (`home.tsx` action `send_chat`)**: requiere sesión activa; INSERT con `.bind()` (parametrizado); `user_id`, `user_name` y `user_picture` tomados del objeto de sesión — el usuario no puede falsificar su identidad.
- **Límite de longitud**: `CHECK(length(message) <= 500)` en DB como defensa en profundidad; validación server-side previa recomendada (verificar si existe en el action).
- **Limpieza automática**: el loader de `home.tsx` elimina mensajes con más de 14 días (`created_at < unixepoch() - 1209600`) en cada carga — evita crecimiento indefinido de la tabla.
- **Admin**: loader de `admin.tsx` lee los últimos 100 mensajes; action `delete_chat_message` borra por `id` con validación `Number.isInteger(id) && id > 0` y query parametrizada. Ambos protegidos por el guard `ADMIN_EMAIL`.

---

## Variables de entorno sensibles

| Variable | Uso | Riesgo si se expone |
|----------|-----|---------------------|
| `GOOGLE_CLIENT_ID` | Identifica la app ante Google | Bajo (es pública en OAuth) |
| `GOOGLE_CLIENT_SECRET` | Autentica la app ante Google | **Alto** — permite impersonar la app |
| `SESSION_SECRET` | Firma las cookies de sesión | **Crítico** — permite forjar sesiones |
| `ADMIN_EMAIL` | Email del único usuario administrador (`/admin`) | **Alto** — permite saber qué cuenta tiene acceso admin |
| `BACKEND_SIGNER_KEY` | Clave privada del signer EIP-712 para recompensas onchain | **Crítico** — permite forjar firmas válidas y reclamar cualquier recompensa |

- En local: `.dev.vars` (ignorado por git vía `.gitignore`).
- En producción: configurar en el dashboard de Cloudflare Pages (nunca en el repo).

---

## Superficie de ataque actual

### Lo que está protegido

- Sesiones no falsificables (firma HMAC).
- Credenciales OAuth nunca expuestas al cliente.
- Cookie con `httpOnly` previene XSS sobre la sesión.
- `secure` en producción previene sniffing en HTTP.

### Riesgos conocidos y pendientes

| Riesgo | Estado | Mitigación |
|--------|--------|------------|
| Sin protección anti-bot en login | **Implementado** | Cloudflare Turnstile en `auth.google.tsx` (verificación condicional por env) |
| Sin WAF | Pospuesto (post-MVP) | Activar Cloudflare WAF en producción (dashboard) |
| Sin rate limiting en `/auth/google` | Pospuesto (post-MVP) | Regla de rate limit en Cloudflare (dashboard) |
| Sin CSRF token explícito | Aceptado (Remix) | `sameSite: lax` mitiga casos comunes; Remix Forms incluye protección nativa |
| Sin logout implementado | **Implementado** | `app/routes/auth.logout.tsx` destruye la sesión y redirige a `/` |
| Sin scope OAuth explícito | **Implementado** | `scope: ["openid", "email", "profile"]` en `GoogleStrategy` |
| Sin validación de longitud máxima en inputs | **Implementado** | `name` ≤ 100, `goals` ≤ 500 en `/home`; `name` ≤ 200, `notes` ≤ 1000 en `/mycollection` |
| Sin validación de `condition` de monedas | **Implementado** | Validado contra enum `MS/AU/XF/VF/F/VG/G/P` |
| Sin validación de `country` de monedas | Pendiente | `country` sigue siendo libre (sin validación ISO) |
| Sin validación server-side de `denomination` y `name` vs módulos | **Implementado** | Validados contra `COINS_BY_COUNTRY[country]` cuando el país existe; `mint` sigue libre |
| Sin validación de magic bytes de imágenes | **Implementado** | Se verifica FF D8 FF antes de subir a R2; `contentType` forzado a `image/jpeg` |
| Sin límite de tamaño de archivo | **Implementado** | Rechaza archivos >5 MB antes de llamar a R2 |
| Sin límite de monedas por usuario | **Implementado** | Máximo 500 monedas por `user_id`; devuelve 429 al superarlo |
| Imágenes R2 accesibles sin autenticación | Aceptado | Las claves contienen UUIDs no predecibles; considerar signed URLs si se requiere mayor restricción |
| Sin rate limiting en endpoints de rewards | **Pendiente** | Llamar a `checkRateLimit` en `api.rewards.request` y `api.rewards.sign` (función ya implementada en `rateLimit.server.ts`) |
| `walletAddress` sin validación de formato | **Pendiente** | Validar `/^0x[0-9a-f]{40}$/i` antes de insertar en `claim_requests` |
| Hash EIP-712 vulnerable a colisión por `\|` | **Pendiente** | Usar ABI encoding (`encodeAbiParameters`) en lugar de concatenación con separador |
| Firma EIP-712 sin expiración onchain | Aceptado (MVP) | Aceptable mientras `coinClaimed` sea la fuente de verdad onchain; revisar si se necesita nonce en el contrato |
| Sin revocación de aprobación admin | Aceptado (MVP) | Mitigado por la expiración de 7 días; agregar endpoint de revocación post-MVP |
| RPC público puede fallar silenciosamente en verificación onchain | **Pendiente** | Error handling añadido (no crashea), pero el fallback `false` puede generar claims inconsistentes; considerar RPC privado con retry o verificación admin explícita |
| `String(e)` expuesto en errores 500 de `api.rewards.request` | **Pendiente** | Sanitizar: devolver mensaje genérico en producción, loguear el error real solo en server logs |
| `walletAddress` del body no re-verificado en `/api/rewards/sign` | **Pendiente** | Consultar `claim_requests.wallet_address` antes de firmar y rechazar si difiere del body; mitigación actual está onchain (EIP-712 incluye `recipient`) |
| Address de AlbumCoin hardcodeada en `ClaimButton` (EIP-747) | Aceptado (MVP) | Si el contrato se redespliega, actualizar `0xf078c79b0F52ABE81394DD455cBc0a63f76bC059` en `ClaimButton.tsx` manualmente |

---

## Checklist antes de producción

- [ ] `SESSION_SECRET` de al menos 32 caracteres aleatorios.
- [ ] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` configurados en Cloudflare Pages.
- [ ] `TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY` configurados en Cloudflare Pages.
- [ ] Dominio de callback registrado en Google Cloud Console.
- [ ] `secure: true` en cookie (automático si `NODE_ENV=production`).
- [ ] Activar Cloudflare WAF (dashboard).
- [ ] Configurar rate limiting en `/auth/google` (dashboard).
- [ ] Revisar CSP vía Cloudflare Transform Rules.
- [ ] Validar `country` contra lista ISO y `collecting_since` contra valores del enum antes de escribir en D1.
- [ ] Aplicar principio de mínimo privilegio al binding de D1 en `wrangler.toml` cuando se configure producción.
- [ ] `BACKEND_SIGNER_KEY` configurado en Cloudflare Pages (nunca en el repo); dirección correspondiente debe coincidir con la desplegada en el contrato `RewardClaimer`.
- [ ] Agregar rate limiting a `api.rewards.request` y `api.rewards.sign` (usar `checkRateLimit` ya existente).
- [ ] Validar `walletAddress` con regex `/^0x[0-9a-f]{40}$/i` antes de insertar en `claim_requests`.
- [ ] Reemplazar concatenación con `|` en `getCoinIdHash` por ABI encoding para eliminar colisiones de hash.
- [ ] Sanitizar errores 500 en `api.rewards.request`: devolver mensaje genérico al cliente, no `String(e)`.
- [ ] Considerar RPC privado (Alchemy/QuickNode) con timeout explícito en `isCoinClaimedOnchain` para evitar inconsistencias por RPC público caído.
- [ ] En `/api/rewards/sign`: consultar `claim_requests.wallet_address` y rechazar si difiere del `walletAddress` enviado en el body.
- [ ] Si AlbumCoin se redespliega, actualizar la address hardcodeada en `ClaimButton.tsx` (EIP-747).
- [ ] Ejecutar `scripts/create-chat-table.mjs` (o la migración equivalente en D1) antes de desplegar el feature de chat global en `admin.tsx`.
