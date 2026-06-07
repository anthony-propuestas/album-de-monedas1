# Tests — Album de Monedas

## Stack de testing

| Herramienta | Rol |
|---|---|
| **Vitest** | Test runner (integrado con Vite, sin config extra de transpilación) |
| **happy-dom** | Entorno DOM simulado para tests de componentes |
| **@testing-library/react** | Render y queries de componentes React |
| **@testing-library/jest-dom** | Matchers extra (`toBeInTheDocument`, `toBeDisabled`, etc.) |
| **@testing-library/user-event** | Simulación de interacciones reales (click, type) |

## Comandos

```bash
npm test              # modo watch (re-corre al guardar)
npm run test:run      # una sola pasada
npm run test:coverage # genera reporte de cobertura en /coverage
```

---

## Archivos de test

### `app/lib/__tests__/utils.test.ts`
**Qué prueba:** la función `cn()` de `app/lib/utils.ts`, que combina clases Tailwind.

| Test | Descripción |
|---|---|
| returns empty string with no arguments | Sin argumentos devuelve `""` |
| concatenates simple classes | `cn("foo", "bar")` → `"foo bar"` |
| ignores falsy values | `null`, `undefined`, `false` se ignoran |
| resolves tailwind conflicts — last class wins | `cn("p-4", "p-2")` → `"p-2"` (tailwind-merge resuelve conflictos) |
| applies conditional object syntax | `{ "font-bold": true, "text-sm": false }` → `"font-bold"` |
| flattens arrays | `cn(["foo", "bar"])` → `"foo bar"` |
| combines object + string syntax | `cn("base", { active: true })` → `"base active"` |
| deduplicates the same class | `cn("flex", "flex")` → `"flex"` |

---

### `app/lib/__tests__/auth.server.test.ts`
**Qué prueba:** la función `createAuth()` de `app/lib/auth.server.ts`, que instancia el autenticador y el almacén de sesión.

| Test | Descripción |
|---|---|
| returns authenticator and sessionStorage without throwing | Con env válido no lanza excepción y retorna ambos objetos |
| authenticator exposes isAuthenticated method | El autenticador tiene el método para verificar sesiones activas |
| authenticator exposes authenticate method | El autenticador tiene el método para iniciar el flujo OAuth |
| sessionStorage exposes getSession, commitSession, destroySession | El storage tiene los tres métodos del ciclo de vida de sesión |
| accepts a request to generate dynamic callbackURL | Cuando se pasa un `Request`, el callbackURL se calcula desde su origin |
| uses /auth/google/callback as default callbackURL when no request | Sin request, el callbackURL es relativo (no rompe) |
| creates independent instances for different envs | Dos llamadas con distinto `GOOGLE_CLIENT_ID` producen autenticadores distintos |

---

### `app/components/ui/__tests__/button.test.tsx`
**Qué prueba:** el componente `Button` de `app/components/ui/button.tsx` y la función `buttonVariants`.

#### Componente Button

| Test | Descripción |
|---|---|
| renders with text content | Renderiza y es encontrable por su texto |
| has data-slot='button' attribute | Tiene el atributo `data-slot="button"` que usa shadcn/ui |
| applies default variant class (bg-primary) | Sin props, usa la variante `default` |
| applies outline variant classes | Variante `outline` incluye `border-border` |
| applies secondary variant classes | Variante `secondary` incluye `bg-secondary` |
| applies ghost variant classes | Variante `ghost` incluye `hover:bg-muted` |
| applies destructive variant classes | Variante `destructive` incluye `bg-destructive` |
| applies link variant classes | Variante `link` incluye `underline-offset-4` |
| applies sm size classes | Tamaño `sm` incluye `h-7` |
| applies lg size classes | Tamaño `lg` incluye `h-9` |
| applies icon size classes | Tamaño `icon` incluye `size-8` |
| merges custom className without losing variant classes | La prop `className` se fusiona sin pisar las clases de la variante |
| calls onClick when clicked | El handler `onClick` se ejecuta al hacer click |
| is disabled when disabled prop is passed | Con `disabled`, el botón queda deshabilitado |
| renders as type='submit' when specified | Acepta `type="submit"` y lo aplica al elemento |

#### Función buttonVariants

| Test | Descripción |
|---|---|
| generates a string for variant X (×6) | Cada variante (`default`, `outline`, `secondary`, `ghost`, `destructive`, `link`) retorna un string no vacío |
| generates a string for size X (×4) | Cada tamaño (`default`, `sm`, `lg`, `icon`) retorna un string no vacío |
| returns default classes when called with no arguments | Sin argumentos usa `default` para variante y tamaño |

---

### `app/routes/__tests__/home.loader.test.ts`
**Qué prueba:** el `loader` de `app/routes/home.tsx`, que protege la ruta `/home`, devuelve el usuario autenticado, ejecuta 3 queries de stats personales en paralelo y carga los mensajes del chat global.

> El módulo `~/lib/auth.server` se mockea completamente para controlar el resultado de `isAuthenticated` sin necesidad de cookies reales. Para los tests de stats se usa `makeMockDbWithStats`, que encadena `mockResolvedValueOnce` para controlar el resultado de cada una de las 4 llamadas a `first()` por separado. `prepareObj` incluye `run` directo (sin bind) para cubrir la query de limpieza del chat.

| Test | Descripción |
|---|---|
| throws a redirect to '/' when user is not authenticated | Si `isAuthenticated` devuelve `null`, el loader lanza un `Response` 302 → `/` |
| returns user data and profileCompleted=false for a new user | Usuario nuevo (sin perfil completo) retorna `{ user, profileCompleted: false }` |
| returns profileCompleted=true for a returning user with complete profile | Usuario con perfil completo retorna `{ user, profileCompleted: true }` |
| calls isAuthenticated with the incoming request | El request original se pasa a `isAuthenticated` tal cual |
| calls createAuth with the cloudflare env | `createAuth` recibe solo el env (sin request) para la verificación de sesión |
| returns stats.total from the DB COUNT query | El valor de `COUNT(*)` de la tabla `coins` aparece en `data.stats.total` |
| returns stats.estimatedValue from the DB SUM query | El valor de `COALESCE(SUM(estimated_value), 0)` aparece en `data.stats.estimatedValue` |
| returns stats.topCondition from the condition query | El campo `condition` del registro con mayor `cnt` aparece en `data.stats.topCondition` |
| stats.total defaults to 0 when DB returns null | Si `first()` devuelve `null` para la query de COUNT, `stats.total` es `0` |
| stats.estimatedValue defaults to 0 when DB returns null | Si `first()` devuelve `null` para la query de SUM, `stats.estimatedValue` es `0` |
| stats.topCondition defaults to null when DB returns null conditionRow | Si `first()` devuelve `null` para la query de condición, `stats.topCondition` es `null` |
| makes at least 7 DB prepare calls | El loader invoca `db.prepare` ≥ 7 veces: INSERT OR IGNORE users + profile + 3 stats + coins + user_badges + messages |
| runs INSERT OR IGNORE for both new and existing users | La query `INSERT OR IGNORE INTO users` siempre se ejecuta, independiente de si el usuario existe |
| response includes all three stats fields | La respuesta contiene `{ total, estimatedValue, topCondition }` con los valores correctos de la DB |
| returns claimedByCountry in response | `data.claimedByCountry` está definido y es un objeto (mapa ISO-2 → count de claimed coins) |
| runs the chat_messages cleanup DELETE query | El loader ejecuta `DELETE FROM chat_messages WHERE created_at < unixepoch() - 1209600` en cada request (limpieza piggyback) |
| queries chat_messages ordered by created_at DESC | El loader consulta los últimos 20 mensajes del chat ordenados por fecha descendente |
| returns chatMessages array in response | `data.chatMessages` existe y es un array |
| returns chatMessages with data from DB | Cuando `prepareObj.all` resuelve con mensajes, éstos aparecen en el response |

---

### `app/routes/__tests__/home.component.test.tsx`
**Qué prueba:** el componente React `Home` de `app/routes/home.tsx`.

> `useLoaderData`, `useFetcher` y `useRevalidator` se mockean para inyectar estado sin necesitar el contexto de Remix. El mock de `defaultLoaderData` incluye `claimedByCountry: {}` y `chatMessages: []` para que `WorldMap` y el chat no lancen errores.

#### Contenido principal

| Test | Descripción |
|---|---|
| renders the welcome message with the user's name | Muestra "Bienvenido, {nombre}" con el nombre del usuario |
| renders all three navigation cards | Las tres cards (Mi colección, Grandes colecciones, Mercados) están en el DOM |
| navigation cards point to the correct hrefs | Los links apuntan a `/collection`, `/collections` y `/markets` |
| renders the app brand name | El nombre "Album de Monedas" está visible |

#### Visibilidad del ProfileSetupModal

| Test | Descripción |
|---|---|
| renders ProfileSetupModal when profileCompleted is false | Si el perfil no está completo, el modal aparece en el DOM |
| does not render ProfileSetupModal when profileCompleted is true | Si el perfil está completo, el modal no se renderiza |

#### Menú lateral (drawer)

| Test | Descripción |
|---|---|
| renders the hamburger menu button | El botón "Abrir menú" está en el DOM |
| drawer is hidden by default | El drawer tiene la clase `-translate-x-full` al cargar |
| opens drawer when hamburger is clicked | Al hacer click en el hamburguesa, el drawer pierde `-translate-x-full` |
| closes drawer when close button is clicked | El botón "Cerrar menú" devuelve el drawer a `-translate-x-full` |
| closes drawer when overlay is clicked | El overlay oscuro cierra el drawer al hacer click |
| drawer contains all navigation items | Noticias, Favoritos y Ajustes están presentes en el drawer |
| drawer nav links point to correct hrefs | Links del drawer apuntan a `/news`, `/favorites`, `/settings` |
| drawer shows '@coleccionista' handle for the user | El handle fijo `@coleccionista` aparece en la sección de perfil del drawer |

---

### `app/routes/__tests__/home.action.test.ts`
**Qué prueba:** el `action` de `app/routes/home.tsx`, que recibe el formulario de perfil y actualiza la base de datos D1.

> `~/lib/auth.server` se mockea para controlar la sesión. La DB se simula con un objeto con `prepare → bind → run/first` en cadena.

| Test | Descripción |
|---|---|
| throws redirect to '/' when user is not authenticated | Sin sesión activa, el action lanza `Response` 302 → `/` |
| returns error for unknown intent | Si `intent` no es reconocido, retorna `{ error: "Acción no reconocida." }` |
| returns error when name is missing | Campo `name` vacío → `{ error: "Todos los campos son obligatorios." }` |
| returns error when country is missing | Campo `country` vacío → mismo error de validación |
| returns error when goals is missing | Campo `goals` vacío → mismo error de validación |
| returns { success: true } when all fields are provided | Con todos los campos válidos retorna `{ success: true }` |
| calls DB UPDATE with correct field values | Verifica que `prepare` recibe la query UPDATE y `bind` los 5 valores en orden correcto |
| does not call DB when validation fails | Si la validación falla, `run()` no se llama nunca |
| trims whitespace from fields | Los espacios al inicio/fin se recortan antes de guardar en la DB |
| send_chat: returns { ok: true } for a valid message | Con `intent=send_chat` y mensaje no vacío retorna `{ ok: true }` |
| send_chat: calls INSERT INTO chat_messages with user data and message | Verifica que `prepare` recibe el INSERT y `bind` los 4 valores (user_id, user_name, user_picture, message) |
| send_chat: returns 400 and no DB call for empty message | Mensaje vacío → status 400 sin llamar a `prepare` con INSERT |
| send_chat: returns 400 for whitespace-only message | Mensaje de solo espacios → status 400 (el trim lo deja vacío) |
| returns 400 when country is not in the ISO whitelist | `country: "XX"` (no existe en `NUMERIC_TO_ALPHA2`) → 400 con error que menciona "país" |

---

### `app/routes/__tests__/auth.google.test.ts`
**Qué prueba:** el `loader` y el `action` de `app/routes/auth.google.tsx`, que inicia el flujo OAuth de Google.

> `~/lib/auth.server` se mockea para interceptar la llamada a `authenticate` sin realizar llamadas reales a Google.

| Test | Descripción |
|---|---|
| (loader) returns null | El loader retorna `null` para que Remix pueda responder a GET `/auth/google.data` con turbo-stream válido |
| calls authenticator.authenticate with 'google' strategy | El action delega en `authenticate("google", request, opts)` |
| passes successRedirect='/home' and failureRedirect='/' | Los redirects configurados son exactamente `/home` y `/` |
| calls createAuth with env + request so callbackURL is dynamic | El request se pasa a `createAuth` para que el callbackURL use el origin correcto |
| returns the response from authenticate | El action retorna la respuesta que produce `authenticate` |

---

### `app/routes/__tests__/auth.google.callback.test.ts`
**Qué prueba:** el `loader` de `app/routes/auth.google.callback.tsx`, que recibe el código de autorización de Google y completa el login.

> `~/lib/auth.server` se mockea para simular tanto el éxito como el fallo de la autenticación.

| Test | Descripción |
|---|---|
| calls authenticator.authenticate with 'google' strategy on callback | Usa la misma estrategia `"google"` en el callback |
| redirects to '/home' on successful authentication | En éxito, la respuesta tiene `Location: /home` y status 302 |
| redirects to '/' on failed authentication | En fallo (p. ej. `error=access_denied`), redirige a `/` |
| calls createAuth with env + request so callbackURL matches the actual origin | El callbackURL del callback debe coincidir con el que usó el action de inicio |
| only calls authenticate once per request | `authenticate` se invoca exactamente una vez por request |

---

### `app/lib/__tests__/countries.test.ts`
**Qué prueba:** la lista exportada `countries` de `app/lib/countries.ts` (datos de países para el formulario de perfil).

| Test | Descripción |
|---|---|
| has at least 150 entries | La lista tiene cobertura mundial (≥ 150 países) |
| each entry has non-empty string value and label | Todos los objetos tienen `value` y `label` como strings no vacíos |
| all values are 2-letter uppercase ISO codes | Cada código cumple el formato ISO 3166-1 alpha-2 (`/^[A-Z]{2}$/`) |
| values are unique (no duplicate codes) | No hay códigos repetidos |
| labels are unique (no duplicate names) | No hay nombres repetidos |
| includes key Latin American and Spanish-speaking countries | AR, MX, ES, CO, CL, PE, VE, UY están presentes |
| Argentina maps to 'Argentina' | El valor `AR` corresponde al label `"Argentina"` |
| US maps to 'Estados Unidos' | El valor `US` corresponde al label `"Estados Unidos"` |

---

### `app/components/__tests__/ProfileSetupModal.test.tsx`
**Qué prueba:** el componente `ProfileSetupModal` de `app/components/ProfileSetupModal.tsx`, que recoge los datos de perfil del usuario tras el primer login.

> `useFetcher` se mockea con una implementación que incluye un `Form` que renderiza un `<form>` nativo, permitiendo interactuar con los inputs reales.

| Test | Descripción |
|---|---|
| renders the modal title | El título "Completa tu perfil" está en el DOM |
| prefills name input with defaultName | El input de nombre muestra el valor recibido por prop |
| renders email as readonly | El input de email tiene el atributo `readonly` |
| renders country options from the countries list | Las opciones Argentina, España y México están en el select de país |
| renders collecting_since options | Las opciones Iniciante, Más de 1 año y Más de 3 años están en su select |
| renders all goal options | Los 6 goals (Organizar, Networking, Comprar/vender, Aprender, Identificar, Encontrar) están en el DOM |
| submit button is disabled when no goals selected | Sin goals seleccionados, el botón de submit está deshabilitado |
| shows hint to select at least one goal | Aparece el texto "Selecciona al menos una opción" |
| enables submit button after selecting a goal | Al seleccionar un goal, el botón queda habilitado |
| hides hint after selecting a goal | El hint desaparece tras seleccionar el primer goal |
| toggling a goal twice re-disables the submit button | Seleccionar y deseleccionar el mismo goal vuelve a deshabilitar el submit |
| multiple goals can be selected simultaneously | Se pueden seleccionar varios goals a la vez |
| shows 'Guardando...' when fetcher state is submitting | Mientras el fetcher está en estado `submitting`, el botón muestra "Guardando..." |
| submit button is disabled while submitting | El botón está deshabilitado durante el envío |
| shows error message from fetcher.data.error | Si `fetcher.data.error` tiene valor, se muestra el mensaje de error |
| hidden input sets intent to complete_profile | El input oculto `intent` tiene el valor `"complete_profile"` |
| hidden goals input updates when goals are toggled | El input oculto `goals` refleja los goals seleccionados como string separado por comas |

---

### `app/routes/__tests__/_index.test.tsx`
**Qué prueba:** el componente `Index` de `app/routes/_index.tsx` (la landing pública).

> `Form` de `@remix-run/react` se reemplaza por un `<form>` nativo. `useLoaderData` se mockea para inyectar `{ totalUsers: 42, totalCoins: 137 }` sin necesitar el contexto de Remix.

#### Hero y onboarding

| Test | Descripción |
|---|---|
| renders the main hero heading | El `<h1>` principal existe en el DOM |
| hero heading mentions the value proposition | El heading menciona "colección" |
| renders the Google login button | El botón "Iniciar sesión" (navbar) está en el DOM |
| login form POSTs to /auth/google | El formulario tiene `method="post"` y `action="/auth/google"` |
| renders 'Cómo funciona' section | La sección explicativa está renderizada |
| renders all three onboarding steps | Los tres pasos (Crea tu cuenta, Sube tus monedas, Conecta y comparte) |
| renders step numbers 01, 02, 03 | Los números de paso aparecen al menos una vez (ahora existen en "¿Cómo funciona?" y en la sección onchain) |
| renders the app description text | El texto del hero menciona "recompensas onchain" |

#### Sección de estadísticas

| Test | Descripción |
|---|---|
| renders 'La comunidad en números' heading | El encabezado de la sección de stats está en el DOM |
| displays the totalUsers count from loader data | El número de coleccionistas (del mock) aparece en el DOM |
| displays the totalCoins count from loader data | El número de piezas (del mock) aparece en el DOM |
| renders 'coleccionistas' label next to user count | El label descriptivo del contador de usuarios está presente |
| renders 'piezas catalogadas' label next to coin count | El label descriptivo del contador de monedas está presente |

#### Sección ¿Por qué Album de Monedas?

| Test | Descripción |
|---|---|
| renders '¿Por qué Album de Monedas?' section | El encabezado de la sección marketing está en el DOM |
| renders all three reason cards | Las tres tarjetas (Compite en rankings, Monedas de todo el mundo, Recompensas por descubrir) están presentes |
| renders reason card descriptions | Los textos de las tarjetas mencionan "leaderboards", "denominación" y "numismáticos" |

#### Sección Álbum Colaborativo · Recompensas Onchain

| Test | Descripción |
|---|---|
| renders 'Álbum Colaborativo · Recompensas Onchain' section label | El label de la nueva sección onchain aparece en el DOM |
| renders 'Sé el primero' heading in onchain section | El `<h2>` con el CTA de recompensas está renderizado |

---

### `app/routes/__tests__/_index.loader.test.ts`
**Qué prueba:** el `loader` de `app/routes/_index.tsx`, que consulta D1 para obtener el conteo de usuarios y piezas sin requerir autenticación.

> La DB se simula con un objeto que encadena `prepare → first`. El mock distingue la query de `users` de la de `coins` inspeccionando el SQL.

| Test | Descripción |
|---|---|
| returns totalUsers and totalCoins from the database | Con datos en DB, retorna los conteos correctos en ambos campos |
| defaults totalUsers to 0 when DB returns null | Si `first()` devuelve `null` para `users`, `totalUsers` es `0` |
| defaults totalCoins to 0 when DB returns null | Si `first()` devuelve `null` para `coins`, `totalCoins` es `0` |
| queries both users and coins tables | El loader consulta ambas tablas (`FROM users` y `FROM coins`) |
| issues exactly two DB queries | `db.prepare` se invoca exactamente 2 veces por llamada al loader |

---

### `app/routes/__tests__/mycollection.loader.test.ts`
**Qué prueba:** el `loader` de `app/routes/mycollection.tsx`, que protege la ruta `/mycollection`, consulta la tabla `coins` en D1 y devuelve los datos filtrados.

> `~/lib/auth.server` se mockea para controlar la sesión. La DB se simula con `prepare → bind → all` en cadena.

| Test | Descripción |
|---|---|
| throws redirect to '/' when unauthenticated | Sin sesión activa, el loader lanza `Response` 302 → `/` |
| returns user and empty coins array | Con sesión válida devuelve `{ user, coins: [] }` cuando no hay piezas |
| returns coins from DB | Las piezas devueltas por `all()` aparecen en `data.coins` |
| returns empty filters when no search params | Sin query params, `data.filters` tiene todos los campos vacíos |
| reflects search params in returned filters | Los params `q`, `country`, `year`, `condition` se reflejan en `data.filters` |
| binds user_id as first parameter | El primer valor en `bind()` es siempre el `user.id` |
| adds LIKE clause and wildcard value for q filter | El parámetro `q` genera `... LIKE ?` y el valor `%peso%` |
| adds country filter to query | El parámetro `country` añade `country = ?` a la query |
| parses year filter as integer | El parámetro `year` se convierte a `number` antes de enviarse a D1 |
| adds condition filter to query | El parámetro `condition` añade `condition = ?` a la query |
| query always ends with ORDER BY created_at DESC | La query siempre incluye el ordenamiento por fecha descendente |
| returns claimStatuses as empty object when no claims | Sin registros en `claim_requests`, `data.claimStatuses` es `{}` |
| maps latest claim per coin_id into claimStatuses | El claim más reciente de cada moneda queda mapeado por `coin_id` |
| sets registry_match to 1 for coin matching catalog | Coin con country AR, nombre y año exactos → `registry_match` pasa a 1 |
| sets registry_match to 0 for coin not in catalog | Coin con country AR pero nombre inexistente → `registry_match` queda en 0 |
| leaves coin unchanged when country has no catalog | Coin con país sin catálogo (ej. MX) → se retorna sin modificar |

---

### `app/routes/__tests__/mycollection.action.test.ts`
**Qué prueba:** el `action` de `app/routes/mycollection.tsx` — intents `add_coin` y `edit_coin`.

> `~/lib/auth.server` se mockea para la sesión. DB y R2 se simulan con `vi.fn()`. Los archivos se crean con la API nativa `File` disponible en happy-dom. Para `edit_coin`, `bindObj.first` usa `mockResolvedValueOnce` para devolver el coin en la primera llamada (ownership check) y null/claim en la segunda (claim check).

#### Intent `add_coin`

| Test | Descripción |
|---|---|
| throws redirect to '/' when unauthenticated | Sin sesión activa, el action lanza `Response` 302 → `/` |
| returns 400 for unknown intent | Si `intent` no coincide con ningún handler conocido, retorna `{ error: "Acción no reconocida." }` con status 400 |
| redirects to /mycollection after successful insert | Con intent y nombre válidos, retorna `Response` 302 → `/mycollection` |
| calls DB INSERT with user_id and coin name | Verifica que `prepare` recibe `INSERT INTO coins` y `bind` contiene `user.id` y el nombre |
| stores null for all photos when IMAGES binding is absent | Sin binding R2, los cuatro slots de foto se guardan como `null` en D1 |
| uploads photo_obverse to R2 and stores its key in DB | Con binding R2 y un `File` no vacío, llama a `images.put` con el key correcto y guarda ese key en D1 |
| parses year as integer and estimated_value as float | Los campos numéricos se convierten antes de guardar (`parseInt`, `parseFloat`) |
| stores null for empty optional text fields | Los campos opcionales no enviados se guardan como `null`, no como string vacío |
| does not upload to R2 when file is empty | Un `File` de 0 bytes no dispara `images.put` |
| returns 400 when mint exceeds 200 chars | Campo `mint` con 201 caracteres → 400 |
| returns 400 when catalog_ref exceeds 200 chars | Campo `catalog_ref` con 201 caracteres → 400 |
| returns 400 when country is not a valid ISO code | `country: "XX"` → 400 con error que menciona "país" |

#### Intent `edit_coin`

| Test | Descripción |
|---|---|
| returns 400 when coin_id is missing | Sin `coin_id` en el form → status 400 con mensaje "ID requerido" |
| returns 404 when coin is not found in DB | Si `first()` devuelve `null` en el ownership check → status 404 |
| returns 403 when coin has an active pending claim | Si existe un claim con status `pending` → status 403 con mensaje "verificación" |
| redirects to /mycollection after successful update | Con coin encontrado y sin claim activo → `Response` 302 → `/mycollection` |
| calls DB UPDATE (not INSERT) with coin_id and user_id in bind args | `prepare` recibe `UPDATE coins SET` y `bind` contiene `coin_id` y `user.id` |
| keeps existing photo key when no new file is submitted | Si no llega un file nuevo, el key existente de R2 se mantiene en los args de `bind` |
| does not call images.delete or images.put when no new file is submitted | Sin nuevo archivo, el bucket R2 no se toca en ningún slot |
| uploads new photo and deletes old one when a valid JPEG is provided | Con JPEG válido para `photo_obverse`, llama a `images.delete(oldKey)` e `images.put(newKey, buffer)` |
| returns 400 when mint exceeds 200 chars | Campo `mint` con 201 caracteres → 400 |
| returns 400 when catalog_ref exceeds 200 chars | Campo `catalog_ref` con 201 caracteres → 400 |
| returns 400 when country is not a valid ISO code | `country: "XX"` → 400 con error que menciona "país" |

---

### `app/routes/__tests__/markets.action.test.ts`
**Qué prueba:** el `action` de `app/routes/markets.tsx` — intent `contact_seller` (validaciones y flujo completo).

| Test | Descripción |
|---|---|
| throws redirect to '/' when unauthenticated | Sin sesión lanza `Response` 302 → `/` |
| returns error when coin_id is missing | Sin `coin_id` en el form → `{ ok: false, error: "Datos inválidos." }` |
| returns error when message is empty | `message` vacío → `{ ok: false, error: "El mensaje no puede estar vacío." }` |
| returns error when contacting self | `seller_id === user.id` → `{ ok: false, error: "No podés contactarte a vos mismo." }` |
| returns error when buyer_contact exceeds 200 chars | `buyer_contact` de 201 chars → `{ ok: false }` con error que menciona `buyer_contact` |
| returns error when message exceeds 1000 chars | `message` de 1001 chars → `{ ok: false }` con error que menciona "largo" |
| returns { ok: true } on success | Mensaje válido con seller distinto → `{ ok: true, error: null }` |

---

### `app/routes/__tests__/images.$.test.ts`
**Qué prueba:** el `loader` de `app/routes/images.$.tsx`, que sirve imágenes almacenadas en R2 como proxy HTTP.

> El bucket R2 se simula con un objeto que expone `get()` y el objeto devuelto implementa `writeHttpMetadata`.

| Test | Descripción |
|---|---|
| throws 404 when key param is missing | Sin parámetro splat, lanza `Response` 404 |
| throws 404 when IMAGES binding is absent | Sin binding R2 en el env, lanza `Response` 404 |
| throws 404 when object is not found in R2 | Si `bucket.get()` devuelve `null`, lanza `Response` 404 |
| calls bucket.get with the correct key | El key del splat param se pasa directamente a `bucket.get` |
| returns 200 response when object is found | Con objeto encontrado, la respuesta tiene status 200 |
| sets immutable Cache-Control header | La respuesta incluye `Cache-Control: public, max-age=31536000, immutable` |
| calls writeHttpMetadata to set content type from object metadata | Se llama a `writeHttpMetadata` y el `Content-Type` del objeto se propaga a la respuesta |

---

### `app/components/__tests__/ImageCropEditor.test.tsx`
**Qué prueba:** el componente `ImageCropEditor` de `app/components/ImageCropEditor.tsx`, que permite centrar y hacer zoom a una imagen antes de subirla, produciendo un recorte circular vía Canvas.

> `HTMLCanvasElement.prototype.getContext` y `toBlob` se mockean porque happy-dom no implementa Canvas. `URL.createObjectURL/revokeObjectURL` también se mockean.

| Test | Descripción |
|---|---|
| renders the slot label | El heading muestra `"Ajustar — {slotLabel}"` con el label recibido por prop |
| shows initial zoom as 1.0× | Al montar, el indicador de zoom muestra `"1.0×"` |
| shows hint text | Aparece el texto `"Arrastra para centrar · Scroll para zoom"` |
| clicking + increases zoom by 0.1 | Al hacer click en `+`, el indicador pasa de `1.0×` a `1.1×` |
| clicking − decreases zoom by 0.1 | Al hacer click en `−` tras dos `+`, vuelve de `1.2×` a `1.1×` |
| zoom does not exceed 5.0× | 50 clicks en `+` dejan el indicador en `5.0×` (límite superior) |
| zoom does not go below 0.5× | 20 clicks en `−` dejan el indicador en `0.5×` (límite inferior) |
| Cancelar calls onCancel | El botón "Cancelar" invoca `onCancel` exactamente una vez |
| Confirmar recorte calls onConfirm with a File | El botón "Confirmar recorte" llama a `onConfirm` con una instancia de `File` |
| File passed to onConfirm has jpeg type | El `File` producido por el crop tiene `type: "image/jpeg"` y `name: "photo.jpg"` |
| renders different slot label passed as prop | Con `slotLabel="Reverso"`, el heading muestra `"Ajustar — Reverso"` |

---

### `app/lib/__tests__/coins.test.ts`
**Qué prueba:** el registro central `COINS_BY_COUNTRY` de `app/lib/coins/index.ts` y los datos de monedas argentinas en `app/lib/coins/argentina.ts`.

#### COINS_BY_COUNTRY registry

| Test | Descripción |
|---|---|
| contains the AR key | El registro tiene la clave `"AR"` |
| AR maps to MONEDAS_ARGENTINA | `COINS_BY_COUNTRY["AR"]` es la misma referencia que `MONEDAS_ARGENTINA` |
| unknown country returns undefined | Una clave inexistente (`"XX"`) devuelve `undefined` |

#### MONEDAS_ARGENTINA data

| Test | Descripción |
|---|---|
| has entries | El array tiene al menos un elemento |
| every entry has the required CoinEntry fields with correct types | Cada entrada tiene `pais`, `denominacion`, `nombre`, `anio` y `casa_acunacion` con los tipos correctos |
| all entries have pais = 'Argentina' | El campo `pais` es siempre `"Argentina"` |
| all entries have casa_acunacion = 'Casa de Moneda de la Argentina' | El campo `casa_acunacion` es siempre el mismo para todas las entradas |
| all years are within reasonable range (1800–2030) | Todos los `anio` están entre 1800 y 2030 inclusive (incluye monedas históricas desde 1881) |
| contains the expected denominations | Las 8 denominaciones (5 Centavos, 10 Centavos, 25 Centavos, 50 Centavos, 1 Peso, 2 Pesos, 5 Pesos, 10 Pesos) están presentes |
| Serie 2 names appear for the correct denominations | "Un Peso — Jacarandá" pertenece a `1 Peso`; "Diez Pesos — Caldén" pertenece a `10 Pesos` |
| filtering by denomination returns only matching entries | `filter(c => c.denominacion === "1 Peso")` devuelve solo entradas de esa denominación |
| filtering by nombre returns matching years in order | Los años de "Un Peso — Jacarandá" comienzan en 2017 y están ordenados |
| find returns the exact coin for a given nombre + anio | Buscar "Un Peso — Jacarandá" + 2020 devuelve la entrada correcta con `casa_acunacion` y `denominacion` correctos |
| no duplicate (denominacion + nombre + anio + serie + material) entries | No existen dos entradas con el mismo quinteto completo |

---

### `app/components/__tests__/AddCoinModal.test.tsx`
**Qué prueba:** el componente `AddCoinModal` de `app/components/AddCoinModal.tsx`, incluyendo el flujo de selección de foto, apertura del editor de crop, actualización del preview circular y los dropdowns en cascada alimentados por módulos de datos de monedas.

> `@remix-run/react` se mockea (`useFetcher` con `Form` funcional). `ImageCropEditor` se reemplaza por un stub que expone botones `mock-confirm` y `mock-cancel`. `CustomSelect` se mockea como `<select>` nativo. `URL.createObjectURL/revokeObjectURL` y `DataTransfer` se mockean.

#### Render y flujo de fotos

| Test | Descripción |
|---|---|
| renders nothing when closed | Con `isOpen=false`, el modal no está en el DOM |
| renders the modal title when open | Con `isOpen=true`, aparece el título "Nueva pieza" |
| renders all 4 photo slot labels | Los labels Anverso, Reverso, Canto y Detalle están presentes |
| does not show crop editor initially | Al montar, el editor de crop no está visible |
| opens crop editor after selecting a file | Al seleccionar un archivo en el primer slot, aparece `data-testid="crop-editor"` |
| crop editor shows the correct slot label for Anverso | El stub del editor muestra `"Anverso"` al usar el primer input |
| crop editor shows Reverso label for the second slot | El stub del editor muestra `"Reverso"` al usar el segundo input |
| closes crop editor after confirming crop | Tras `mock-confirm`, el editor desaparece del DOM |
| shows circular preview after confirming crop | Tras confirmar, aparece un `<img>` dentro de `.rounded-full` con `src="blob:mock"` |
| closes crop editor after canceling | Tras `mock-cancel`, el editor desaparece del DOM |
| does not show preview after canceling crop | Tras cancelar, no hay `<img>` dentro de `.rounded-full` |
| shows 'Guardando...' while submitting | Con `fetcher.state="submitting"`, el botón muestra "Guardando..." |
| submit button is disabled while submitting | El botón de submit está deshabilitado durante el envío |
| calls onClose when clicking the X button | El botón X del header llama a `onClose` |
| calls onClose when clicking Cancelar | El botón "Cancelar" del footer llama a `onClose` |

#### Cascade dropdowns

| Test | Descripción |
|---|---|
| denomination is a free-text input before selecting a country | Sin país seleccionado, `denomination` es un `<input>` libre |
| name is a free-text input before selecting a country | Sin país seleccionado, `name` es un `<input>` libre |
| year is a number input before selecting a country | Sin país seleccionado, `year` es un `<input type="number">` |
| selecting Argentina converts denomination to a select | Al seleccionar `AR`, el campo `denomination` se convierte en `<select>` |
| Argentina denomination select has all expected options | El select de denominación incluye todas las denominaciones del módulo de Argentina |
| name remains free-text after selecting country but before selecting denomination | Con país pero sin denominación, `name` sigue siendo `<input>` libre |
| selecting a denomination converts year to a select | Al elegir una denominación, `year` se convierte en `<select>` (cascada: País → Denominación → Año → Nombre) |
| year select options match years of the selected denomination | Las opciones de `year` corresponden a los años del módulo filtrados por la denominación elegida |
| selecting a year converts name to a select | Al elegir un año, `name` se convierte en `<select>` |
| name select options match names for selected denomination and year | Las opciones de `name` corresponden a los nombres del módulo filtrados por denominación + año |
| mint auto-fills and is read-only after selecting a complete chain | Al completar País → Denominación → Año → Nombre, el campo `mint` muestra `"Casa de Moneda de la Argentina"` y tiene `readOnly=true` |
| mint is empty before completing the chain | Sin una selección completa, `mint` está vacío y no es read-only |
| changing country resets denomination, name and year to free inputs | Cambiar el país limpia todos los campos inferiores y los devuelve a inputs libres |
| changing denomination resets year value and name to free input | Cambiar la denominación resetea el valor de `year` (queda Select vacío) y `name` vuelve a ser `<input>` libre |

---

### `app/components/__tests__/EditCoinModal.test.tsx`
**Qué prueba:** el componente `EditCoinModal` de `app/components/EditCoinModal.tsx` — modal para editar una moneda existente, incluyendo pre-relleno de campos, previsualización de fotos existentes y flujo de reemplazo con crop.

> `@remix-run/react` se mockea (`useFetcher` con `Form` funcional). `ImageCropEditor` se reemplaza por un stub con botones `mock-confirm` y `mock-cancel`. `CustomSelect` se mockea como `<select>` nativo. `URL.createObjectURL/revokeObjectURL` y `DataTransfer` se mockean. El mockCoin usa `country: "MX"` (sin datos en catálogo) para que todos los campos del formulario sean inputs libres, simplificando las aserciones.

| Test | Descripción |
|---|---|
| renders nothing when isOpen is false | Con `isOpen=false`, el modal no está en el DOM |
| renders nothing when coin is null even if isOpen is true | Sin moneda, el modal no se renderiza aunque `isOpen=true` |
| shows 'Editar pieza' title when open with a coin | Con `isOpen=true` y coin válida, aparece el título "Editar pieza" |
| pre-fills name input with coin.name | El input `name` tiene `defaultValue` igual a `coin.name` |
| pre-fills year input with coin.year | El input `year` tiene `defaultValue` igual a `coin.year` como string |
| has hidden intent input with value 'edit_coin' | El input oculto `intent` tiene `value="edit_coin"` |
| has hidden coin_id input with correct id | El input oculto `coin_id` tiene el id de la moneda |
| shows existing photo preview for photo_obverse using /images/ URL | Si `coin.photo_obverse` existe, el `<img alt="Anverso">` tiene src `/images/{key}` |
| shows 'Tocar para cambiar' overlay when photo exists | Con foto existente, aparece el texto "Tocar para cambiar" en el overlay |
| renders all 4 photo slot labels | Los 4 labels (Anverso, Reverso, Canto, Detalle) están en el DOM |
| does not show crop editor initially | Al montar, el editor de crop no está visible |
| opens crop editor after selecting a file on a slot without existing photo | Seleccionar un archivo en un slot sin foto abre `data-testid="crop-editor"` |
| crop editor shows correct slot label when triggered | El stub del editor muestra el label del slot triggereado |
| closes crop editor after confirming crop | Tras `mock-confirm`, el editor desaparece |
| closes crop editor after canceling | Tras `mock-cancel`, el editor desaparece |
| shows 'Guardando...' while submitting | Con `fetcher.state="submitting"`, el botón muestra "Guardando..." |
| submit button is disabled while submitting | El botón de submit está deshabilitado durante el envío |
| submit button shows 'Guardar cambios' when idle | En estado idle el botón muestra "Guardar cambios" |
| calls onClose when clicking Cancelar | El botón "Cancelar" llama a `onClose` |
| calls onClose when clicking the X button | El botón X del header llama a `onClose` |
| shows error message from fetcher.data.error | Si `fetcher.data.error` tiene valor, el mensaje aparece en el DOM |

---

### `app/components/__tests__/CoinCard.test.tsx`
**Qué prueba:** el componente `CoinCard` de `app/components/CoinCard.tsx`, que muestra la tarjeta compacta de una moneda (foto circular + precio estimado).

| Test | Descripción |
|---|---|
| shows 'Sin foto' placeholder when no photo_obverse | Sin `photo_obverse`, se muestra el placeholder "Sin foto" |
| renders img with correct /images/ src when photo_obverse is set | Con `photo_obverse`, el `<img>` tiene `src="/images/{key}"` |
| renders alt text for obverse image | El `<img>` tiene alt `"Anverso de {nombre}"` |
| does not render denomination element when null | La denominación no aparece (el componente no la renderiza) |
| does not render condition badge when condition is null | Sin condición, no hay badge (el componente no lo renderiza) |
| renders placeholder icon when no photo | Sin foto, no hay `<img>` en el DOM |
| image is wrapped inside a rounded-full container | Con foto, el `<img>` está dentro de un elemento con clase `rounded-full` |
| placeholder is inside the rounded-full container | Sin foto, el texto "Sin foto" está dentro del contenedor `rounded-full` |
| shows $0.00 when estimated_value is null | Sin valor estimado, la etiqueta de precio muestra `$0.00` |
| shows estimated_value formatted to two decimals | El valor `42.5` se muestra como `$42.50` |

---

### `app/components/__tests__/CoinDetailModal.test.tsx`
**Qué prueba:** el componente `CoinDetailModal` de `app/components/CoinDetailModal.tsx`, que muestra un modal con el detalle completo de una moneda: galería de fotos, datos y notas.

> No requiere mocks de Remix. `userEvent` se usa para las interacciones de galería y cierre.

#### Render básico

| Test | Descripción |
|---|---|
| returns null when coin is null | Con `coin={null}`, el contenedor está vacío |
| renders coin name in header | El `<h2>` muestra el nombre de la moneda |
| renders country and year separated by · | El subtítulo muestra `"MX · 1964"` |
| renders only country when year is null | Sin año, solo se muestra el país |
| renders only year when country is null | Sin país, solo se muestra el año |
| does not render subtitle when both country and year are null | Sin ambos campos, no hay subtítulo |

#### Datos opcionales

| Test | Descripción |
|---|---|
| shows denomination when present | La denominación aparece en el DOM |
| does not render denomination when null | Sin denominación, el label no aparece |
| shows full condition label — MS maps to 'MS — Mint State' | El código de condición se expande al label completo |
| does not render condition when null | Sin condición, el label no aparece |
| shows mint when present | La casa de acuñación aparece en el DOM |
| shows catalog_ref when present | La referencia de catálogo aparece en el DOM |
| shows estimated_value formatted as '$X.XX USD' | El valor estimado se formatea con `$` y `USD` |
| does not render estimated_value when null | Sin valor estimado, el label no aparece |
| shows notes section when notes is present | El texto de notas y su encabezado están en el DOM |
| does not render notes section when notes is null | Sin notas, la sección "Historia de cómo se consiguió" no aparece |

#### Galería de fotos

| Test | Descripción |
|---|---|
| shows placeholder icon when coin has no photos | Sin fotos, no hay `<img>` en el DOM |
| renders active photo with correct /images/ src | Con `photo_obverse`, el `<img>` principal tiene `src="/images/{key}"` |
| does not show thumbnail nav when only one photo | Con una sola foto, no se renderizan thumbnails adicionales |
| shows thumbnail nav when multiple photos | Con varias fotos, hay más de un `<img>` en el DOM |
| clicking a thumbnail changes the active photo | Al hacer click en el thumb "Reverso", el `<img>` principal cambia al src del reverso |

#### Interacción / cierre

| Test | Descripción |
|---|---|
| clicking the X button calls onClose | El botón "Cerrar" invoca `onClose` exactamente una vez |
| clicking the backdrop calls onClose | El click en el fondo oscuro invoca `onClose` |
| clicking inside the modal body does NOT call onClose | El click dentro del contenido del modal no propaga el cierre |

---

### `app/components/__tests__/CoinFilters.test.tsx`
**Qué prueba:** el componente `CoinFilters` de `app/components/CoinFilters.tsx`, que muestra los controles de búsqueda y filtrado de la galería.

> `useNavigate` y `useSearchParams` de `@remix-run/react` se mockean para evitar la dependencia del router.

| Test | Descripción |
|---|---|
| renders text search input with placeholder | El input de búsqueda tiene placeholder "Buscar pieza..." |
| renders year number input with placeholder | El input de año tiene placeholder "Año" |
| renders country select with default empty option | El select de país incluye la opción "Todos los países" |
| renders condition select with default empty option | El select de condición incluye la opción "Todos los estados" |
| renders all 8 condition options | Los 8 grados (`MS`, `AU`, `XF`, `VF`, `F`, `VG`, `G`, `P`) están como opciones |
| prefills search input with q filter value | El input de búsqueda muestra el valor del filtro `q` recibido por prop |
| prefills year input with year filter value | El input de año muestra el valor del filtro `year` recibido por prop |
| renders at least one country option from the countries list | Al menos "México" está presente en el select de país |

---

### `app/lib/__tests__/collections.test.ts`
**Qué prueba:** el módulo `app/lib/collections.ts` — el array `CATEGORIES` con las 8 categorías de ranking, la función `getCategoryBySlug`, y las funciones `statLabel` de cada categoría.

#### CATEGORIES

| Test | Descripción |
|---|---|
| has exactly 8 categories | El array tiene exactamente 8 entradas |
| every category has all required fields | Cada entrada tiene `slug`, `title`, `description`, `iconKey`, `sql` y `statLabel` con los tipos correctos |
| all slugs are unique | No hay slugs duplicados |
| every SQL string contains a ? placeholder for LIMIT | Todas las queries tienen `?` para el bind de LIMIT |
| contains the expected 8 slugs | Los 8 slugs esperados están presentes: `most-pieces`, `oldest`, `highest-value`, `most-countries`, `best-condition`, `most-active`, `most-denominations`, `veteran` |

#### getCategoryBySlug

| Test | Descripción |
|---|---|
| returns the correct category for a valid slug | Con `"most-pieces"` devuelve la categoría con `title = "Mayor cantidad de piezas"` |
| returns undefined for an unknown slug | Un slug inexistente devuelve `undefined` |
| returns undefined for empty string | String vacío devuelve `undefined` |
| finds category '{slug}' by slug (×8) | Cada uno de los 8 slugs es encontrado correctamente |

#### statLabel por categoría (×8)

| Test | Descripción |
|---|---|
| most-pieces: formats a numeric count as '{n} piezas' | `42` → `"42 piezas"` |
| most-pieces: returns '—' for null | `null` → `"—"` |
| oldest: formats a year as 'Desde {year}' | `1895` → `"Desde 1895"` |
| highest-value: includes $ and USD in the formatted value | El resultado contiene `"$"` y `"USD"` |
| most-countries: formats count as '{n} países' | `15` → `"15 países"` |
| best-condition: formats percentage as '{n}% MS/AU' | `87.5` → `"87.5% MS/AU"` |
| most-active: formats count as '{n} este mes' | `5` → `"5 este mes"` |
| most-denominations: formats count as '{n} denominaciones' | `8` → `"8 denominaciones"` |
| veteran: formats a year string as 'Desde {year}' | `"1998"` → `"Desde 1998"` |
| (cada categoría) returns '—' for null | `null` → `"—"` en todas las categorías |

---

### `app/routes/__tests__/collections.loader.test.ts`
**Qué prueba:** el `loader` de `app/routes/collections._index.tsx`, que protege la ruta `/collections`, ejecuta las 8 queries de preview en paralelo y devuelve las categorías barajadas.

> `~/lib/auth.server` se mockea. La DB se simula con `prepare → bind → first` encadenados; `first()` devuelve el mismo resultado para las 8 queries simultáneas.

| Test | Descripción |
|---|---|
| throws redirect to '/' when unauthenticated | Sin sesión activa, lanza `Response` 302 → `/` |
| returns exactly 8 previews | El array `previews` tiene exactamente 8 elementos |
| calls DB prepare exactly 8 times — one per category | `db.prepare` se invoca 8 veces (una por categoría) |
| binds 1 as LIMIT for every preview query | Todas las calls a `bind()` usan `1` como argumento (LIMIT 1 para preview) |
| each preview has the required shape | Cada preview tiene `slug`, `title`, `description`, `iconKey`, `topName`, `topPicture`, `topStat` |
| topName and topStat are null when DB returns no top user | Si `first()` devuelve `null`, `topName` y `topStat` son `null` |
| populates topName and topStat when DB returns a top user | Si `first()` devuelve un usuario, `topName` y `topStat` tienen valor |
| all 8 category slugs are present in the response | Los 8 slugs están presentes aunque el orden sea aleatorio |
| topPicture reflects the picture from DB | El campo `topPicture` es el mismo que devuelve `first()` |

---

### `app/routes/__tests__/collections.category.loader.test.ts`
**Qué prueba:** el `loader` de `app/routes/collections.$category.tsx`, que valida el slug de categoría, ejecuta la query de top 10 y devuelve los coleccionistas con la stat formateada.

> `~/lib/auth.server` se mockea. La DB se simula con `prepare → bind → all` encadenados.

| Test | Descripción |
|---|---|
| throws redirect to '/' when unauthenticated | Sin sesión activa, lanza `Response` 302 → `/` |
| throws 404 Response for an invalid category slug | Un slug desconocido lanza `Response` 404 |
| returns category title and description for most-pieces | Devuelve `title = "Mayor cantidad de piezas"`, `description` y `slug` correctos |
| binds 10 as LIMIT for the top-10 query | `bind()` recibe `10` como argumento (top 10 coleccionistas) |
| returns empty collectors array when DB has no rows | Con `all()` vacío, `collectors` es `[]` |
| maps DB rows to collectors with userId, name, picture, stat | Las filas de la DB se mapean a `{ userId, name, picture, stat }` con `statLabel` aplicado |
| applies statLabel — oldest formats year with 'Desde' | Para `oldest`, `stat: 1902` se convierte en `"Desde 1902"` |
| resolves with status 200 for valid slug '{slug}' (×8) | Cada uno de los 8 slugs válidos devuelve status 200 |

---

### `app/routes/__tests__/collection.userId.loader.test.ts`
**Qué prueba:** el `loader` de `app/routes/collection.$userId.tsx`, que protege la ruta, carga el perfil público de un coleccionista y sus monedas con filtros opcionales.

> `~/lib/auth.server` se mockea. La DB se simula con dos calls a `prepare` encadenadas: la primera usa `first()` (perfil del usuario) y la segunda usa `all()` (monedas).

| Test | Descripción |
|---|---|
| throws redirect to '/' when unauthenticated | Sin sesión activa, lanza `Response` 302 → `/` |
| throws 404 when userId does not exist in DB | Si `first()` devuelve `null`, lanza `Response` 404 |
| returns profileUser and coins | Con usuario existente, `data.profileUser` y `data.coins` tienen los valores de la DB |
| returns empty filters when no search params | Sin query params, `data.filters` tiene todos los campos vacíos |
| reflects search params in returned filters | Los params `q`, `country`, `year`, `condition` se reflejan en `data.filters` |
| includes 'from' param in response when present in URL | `?from=most-pieces` se devuelve en `data.from` |
| returns empty string for 'from' when not in URL | Sin `from` en la URL, `data.from` es `""` |
| applies q filter — SQL contains LIKE and wildcard is bound | El parámetro `q` genera `LIKE` en el SQL y `"%peso%"` en el bind |
| applies country filter — SQL contains country clause | El parámetro `country` añade `country = ?` y vincula el valor |
| parses year filter as integer | El parámetro `year` se convierte a `number` antes de enviarse a D1 |
| coin query ends with ORDER BY created_at DESC | La query de monedas siempre termina con ordenamiento por fecha descendente |

---

### `app/components/__tests__/CategoryTile.test.tsx`
**Qué prueba:** el componente `CategoryTile` de `app/components/CategoryTile.tsx`, que muestra una tarjeta clicable con el nombre de la categoría, su descripción y un preview del #1 actual.

> `@remix-run/react` se mockea: `Link` se reemplaza por un `<a>` nativo para evitar la dependencia del router.

| Test | Descripción |
|---|---|
| renders a link pointing to /collections/:slug | El elemento `<a>` apunta a `/collections/{slug}` |
| renders the category title | El título de la categoría está en el DOM |
| renders the category description | La descripción de la categoría está en el DOM |
| shows 'Sin datos aún' when topName is null | Sin top user, se muestra el texto `"Sin datos aún"` |
| shows topName when provided | Cuando hay top user, su nombre aparece en el tile |
| shows topStat when topName and topStat are provided | El stat formateado aparece bajo el nombre del top user |
| does not show 'Sin datos aún' when topName is set | Con top user, `"Sin datos aún"` no aparece |
| shows first uppercase letter of topName when picture is null | Sin foto, se muestra la inicial en mayúscula del nombre |
| renders an img with correct src when topPicture is provided | Con foto, el `<img>` tiene `src` y `alt` correctos |
| does not render an img when topPicture is null | Sin foto, no hay `<img>` en el DOM |
| renders without crashing for iconKey '{key}' (×8) | Los 8 iconos (`layers`, `clock`, `trending-up`, `globe`, `star`, `zap`, `grid`, `award`) no lanzan error |
| uses correct slug in href for different slugs | Un slug distinto produce el href correcto |

---

### `app/components/__tests__/CollectorRow.test.tsx`
**Qué prueba:** el componente `CollectorRow` de `app/components/CollectorRow.tsx`, que muestra una fila del ranking con posición, avatar, nombre clicable y stat.

> `@remix-run/react` se mockea: `Link` se reemplaza por un `<a>` nativo.

#### Medallas de posición

| Test | Descripción |
|---|---|
| shows 🥇 for rank 1 | El primer lugar muestra el emoji 🥇 |
| shows 🥈 for rank 2 | El segundo lugar muestra el emoji 🥈 |
| shows 🥉 for rank 3 | El tercer lugar muestra el emoji 🥉 |
| shows '#4' for rank 4 | El cuarto lugar muestra `"#4"` |
| shows '#10' for rank 10 | El décimo lugar muestra `"#10"` |
| does not show a medal emoji for rank 4+ | A partir del cuarto lugar no hay emojis de medalla |

#### Comportamiento del link

| Test | Descripción |
|---|---|
| renders the user name as a link | El nombre del coleccionista es un `<a>` clicable |
| link points to /collection/:userId without from param | Sin `fromCategory`, el href es `/collection/{userId}` |
| link includes ?from=:slug when fromCategory is provided | Con `fromCategory`, el href incluye `?from={slug}` |
| link has no 'from' param when fromCategory is not provided | Sin `fromCategory`, el href no contiene `"from"` |
| link uses fromCategory slug correctly | El slug de `fromCategory` se refleja correctamente en la URL |

#### Avatar y stat

| Test | Descripción |
|---|---|
| shows the first uppercase letter of name when picture is null | Sin foto, se muestra la inicial en mayúscula |
| renders an img when picture is provided | Con foto, el `<img>` tiene `src` y `alt` correctos |
| does not render an img when picture is null | Sin foto, no hay `<img>` en el DOM |
| renders the stat text | El texto del stat aparece en el DOM |
| renders different stat formats | El stat acepta formatos distintos (`"Desde 1895"`, etc.) |

---

### `app/lib/__tests__/rateLimit.server.test.ts`
**Qué prueba:** `checkRateLimit` de `app/lib/rateLimit.server.ts` — lógica de rate limiting por usuario+acción en D1.

| Test | Descripción |
|---|---|
| allows when count is below limit | `allowed: true`, `remaining` correcto, `retryAfterSeconds: 0` |
| allows when count equals limit exactly | En el límite exacto sigue siendo `allowed: true` |
| blocks when count exceeds limit | `allowed: false`, `remaining: 0` |
| returns correct retryAfterSeconds when blocked | `retryAfterSeconds` es el tiempo hasta el fin de la ventana actual |
| clamps remaining to 0 when count exceeds limit by more than 1 | `remaining` nunca es negativo |
| calls prepare with bind params (no string interpolation) | Los parámetros van vía `.bind()`, no interpolados en el SQL |
| falls back to count 1 when db returns null | Si la DB devuelve `null`, asume count 1 (primer request) |

---

### `app/lib/__tests__/rewards.server.test.ts`
**Qué prueba:** las tres funciones exportadas de `app/lib/rewards.server.ts` — `getCoinIdHash`, `signClaim`, `isCoinClaimedOnchain`.

| Test | Descripción |
|---|---|
| returns a 0x-prefixed string | El hash resultante empieza con `0x` |
| is deterministic for the same inputs | Mismos inputs → mismo hash siempre |
| produces different hashes for different inputs | Inputs distintos → hashes distintos |
| returns the signature from signTypedData | `signClaim` retorna la firma del mock de viem |
| calls signTypedData with correct EIP-712 domain | El dominio EIP-712 incluye `name: "RewardClaimer"`, `chainId: 8453` (Base Mainnet) y `primaryType: "Claim"` |
| returns true when contract reports claimed | `isCoinClaimedOnchain` retorna `true` si el contrato lo indica |
| returns false when contract reports not claimed | `isCoinClaimedOnchain` retorna `false` si el contrato lo indica |
| calls readContract with correct functionName | Llama a `coinClaimed` con el hash correcto |
| returns false when readContract throws | `isCoinClaimedOnchain` atrapa el error de red/contrato y devuelve `false` |

---

### `app/routes/__tests__/api.rewards.request.test.ts`
**Qué prueba:** el `action` de `app/routes/api.rewards.request.tsx` — 10 tests.

> Los fixtures usan la constante `COIN_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479"` (UUID v4 válido) para que las requests pasen la validación UUID antes de llegar a los mocks de D1.

| Test | Descripción |
|---|---|
| returns 401 when unauthenticated | Sin sesión activa retorna 401 |
| returns 404 when coin not found | Moneda no encontrada en D1 retorna 404 |
| returns 400 when coin not in catalog | Coin no encontrado en el catálogo → 400 |
| returns 409 when active claim request exists | Ya hay pending/approved/claimed → 409 |
| returns 409 when already claimed onchain | Reclamado onchain → 409 |
| returns 200 with claimRequestId on happy path | Inserta registro y retorna `{ claimRequestId, status: "pending" }` |
| returns 400 when missing coinId | Sin `coinId` en el body → 400 |
| returns 500 on unexpected error | Error inesperado en el action → 500 con `{ error: string }` |
| returns 429 when rate limit exceeded | Límite de 3 req/h superado → 429 |
| returns 400 when walletAddress is not a valid Ethereum address | `walletAddress` con formato inválido → 400 con error que menciona wallet |

---

### `app/routes/__tests__/api.rewards.sign.test.ts`
**Qué prueba:** el `action` de `app/routes/api.rewards.sign.tsx`.

> Usa `COIN_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479"` en todos los requests. El test de scoping verifica `bind(COIN_ID, "user-1")`.

| Test | Descripción |
|---|---|
| returns 401 when unauthenticated | Sin sesión retorna 401 |
| returns 404 when no approved claim exists | Sin claim aprobado → 404 |
| returns 410 when claim is expired | Claim expirado → 410 |
| returns 403 when wallet does not match | Wallet diferente → 403 |
| returns 200 with signature on happy path | Retorna `{ signature, coinIdHash }` |
| returns 400 when missing walletAddress | Sin wallet en body → 400 |
| returns 429 when rate limit exceeded | Límite de 5 req/h superado → 429 |
| scopes DB query to the authenticated user's claims only | bind recibe coinId + user.id → claims ajenos devuelven 404 en lugar de 403 |

---

### `app/routes/__tests__/api.rewards.status.coinId.test.ts`
**Qué prueba:** el `loader` de `app/routes/api.rewards.status.$coinId.tsx`.

| Test | Descripción |
|---|---|
| throws redirect when unauthenticated | Sin sesión lanza redirect 302 |
| returns eligible when no claim exists | Sin registro en D1 → `{ status: "eligible" }` |
| returns approved status with expiresAt and coinIdHash | Status approved incluye `expiresAt` y `coinIdHash` |
| returns rejected status with rejectReason | Status rejected incluye `rejectReason` |
| returns pending status | Status pending se retorna sin campos extra |

---

### `app/routes/__tests__/admin_.rewards.test.ts`
**Qué prueba:** el `loader` de `app/routes/admin_.rewards.tsx`.

| Test | Descripción |
|---|---|
| throws redirect when unauthenticated | Sin sesión lanza redirect 302 |
| throws redirect when user is not admin | Email no coincide con ADMIN_EMAIL → redirect |
| returns claims for admin user | Admin recibe el array de claims pendientes |
| returns empty array when no pending claims | Sin claims pendientes → `{ claims: [] }` |

---

### `app/routes/__tests__/admin.rewards.id.approve.test.ts`
**Qué prueba:** el `action` de `app/routes/admin.rewards.$id.approve.tsx`.

| Test | Descripción |
|---|---|
| throws redirect to / when unauthenticated | Sin sesión → redirect a `/` |
| throws redirect to / when user is not admin | No admin → redirect a `/` |
| runs UPDATE and redirects to /admin/rewards for admin | Admin ejecuta UPDATE y redirige a `/admin/rewards` |
| passes claim id to the UPDATE query | El `id` del param se pasa al bind del UPDATE |

---

### `app/routes/__tests__/admin.rewards.id.reject.test.ts`
**Qué prueba:** el `action` de `app/routes/admin.rewards.$id.reject.tsx`.

| Test | Descripción |
|---|---|
| throws redirect to / when unauthenticated | Sin sesión → redirect a `/` |
| throws redirect to / when user is not admin | No admin → redirect a `/` |
| runs UPDATE and redirects to /admin/rewards for admin | Admin ejecuta UPDATE y redirige a `/admin/rewards` |
| passes reject_reason to the UPDATE query | El motivo del form se pasa al UPDATE |
| uses fallback reason when reject_reason is absent | Sin campo → usa `"Sin motivo"` como fallback |

---

### `app/components/__tests__/AdminRewardsPanel.test.tsx`
**Qué prueba:** el componente `AdminRewardsPanel` de `app/components/AdminRewardsPanel.tsx`.

| Test | Descripción |
|---|---|
| shows placeholder when claims is empty | Lista vacía muestra "No hay solicitudes pendientes" |
| renders claim name | El nombre de la moneda se muestra solo en su `<p>` |
| renders denomination in DataField | La denominación se muestra en el campo de datos |
| renders country and year together | País y año se muestran como `"Argentina · 1960"` |
| renders wallet address | La dirección de wallet se muestra en la tarjeta |
| renders registry key | El `coin_registry_key` se muestra en la tarjeta |
| renders Aprobar button with correct form action | El form apunta a `/admin/rewards/{id}/approve` |
| renders Rechazar button | El botón Rechazar está presente |
| opens reject modal when Rechazar is clicked | Click en Rechazar abre el modal con textarea |
| reject modal form points to correct action | El form del modal apunta a `/admin/rewards/{id}/reject` |
| closes modal when Cancelar is clicked | Click en Cancelar cierra el modal |
| renders placeholder image when photo_obverse is null | Sin foto muestra "Sin foto" |
| renders obverse img when photo_obverse is set | Con foto anverso renderiza `<img alt="Anverso">` |
| renders reverse img when photo_reverse is set | Con foto reverso renderiza `<img alt="Reverso">` |
| does not render reverse img when photo_reverse is null | Sin foto reverso no hay `<img alt="Reverso">` |
| renders condition label using CONDITION_LABELS mapping | `condition: "MS"` → muestra `"MS — Mint State"` |
| renders mint | Casa de acuñación se muestra en la tarjeta |
| renders catalog_ref | Referencia de catálogo se muestra en la tarjeta |
| renders estimated_value formatted | `estimated_value: 12.5` → muestra `"$12.50 USD"` |
| renders notes | Notas se muestran en la tarjeta si existen |
| shows count of pending claims | Muestra el conteo de solicitudes pendientes |

---

### `app/providers/__tests__/WagmiProvider.test.tsx`
**Qué prueba:** el componente `Providers` de `app/providers/WagmiProvider.tsx`, que envuelve la app con wagmi y TanStack Query para soporte de wallet onchain.

> `wagmi`, `wagmi/chains` y `@tanstack/react-query` se mockean completamente; son librerías browser-only que requieren wallet real y no funcionan en happy-dom sin mock.

| Test | Descripción |
|---|---|
| renders children | `<Providers>` renderiza su children en el DOM sin error |
| creates a new QueryClient per mount | El constructor `QueryClient` se invoca al montar el componente |

---

### `app/components/__tests__/ClaimButton.test.tsx`
**Qué prueba:** el componente `ClaimButton` de `app/components/ClaimButton.tsx`, que gestiona el ciclo de vida del claim de recompensa onchain por moneda.

> `wagmi` (`useWriteContract`, `useWaitForTransactionReceipt`, `useAccount`), `~/lib/contracts/abi` y `~/lib/contracts/addresses` se mockean completamente. `global.fetch` se mockea con `vi.fn()` para interceptar los POST a `/api/rewards/request` y `/api/rewards/sign`. La lógica de conexión de wallet fue migrada a `WalletConnectButton`; `ClaimButton` retorna `null` directamente cuando no hay address. El estado de cooldown se recibe vía prop `inCooldown` (ya no se lee `useReadContract` dentro del componente — esa lectura la hace `MyCollection` una sola vez).

| Test | Descripción |
|---|---|
| returns null when registryMatch is 0 | Sin `registry_match`, el componente no renderiza nada |
| returns null when registryMatch is undefined | Campo ausente también devuelve null |
| returns null when address is undefined | Sin wallet conectada el componente no renderiza nada |
| shows Reclamar Token button when status=eligible | Estado eligible con wallet conectada muestra "Reclamar Token" |
| shows disabled En revisión when status=pending | Estado pending desactiva el botón |
| shows disabled rejected button with reason when status=rejected | Estado rejected muestra el motivo y está deshabilitado |
| shows Reclamado text when status=claimed | Estado claimed muestra texto fijo sin botón |
| shows countdown Confirmar button when status=approved and not expired | `expiresAt` futuro → botón "🎁 Confirmar — Xd Xh" |
| shows Reclamar Token when approved but expired | `expiresAt` pasado → trata el claim como eligible |
| click Reclamar Token calls fetch POST /api/rewards/request | Clic manda POST con coinId + walletAddress del hook |
| muestra En espera cuando inCooldown=true | Prop `inCooldown={true}` → botón disabled "En espera"; no aparece "Reclamar Token" |
| handleClaim muestra error de API cuando /api/rewards/sign falla | Fetch retorna !ok → el mensaje de error del servidor aparece debajo del botón |
| approved muestra writeError cuando el contrato falla | Error de wagmi en useWriteContract → se muestra el mensaje debajo del botón |

---

### `app/components/__tests__/WalletConnectButton.test.tsx`
**Qué prueba:** el componente `WalletConnectButton` de `app/components/WalletConnectButton.tsx`, que gestiona la conexión/desconexión de wallet y aparece en el header de `/mycollection`.

> `wagmi` (`useAccount`, `useConnect`, `useDisconnect`) y `wagmi/connectors` (`injected`) se mockean completamente.

| Test | Descripción |
|---|---|
| shows connect message when not connected | Con `isConnected: false`, muestra "Conecta tu wallet para participar de las recompensas onchain" |
| clicking connect message calls connect with injected connector | Click llama a `connect({ connector: injected() })` |
| shows truncated address when connected | Con address larga, muestra los primeros 6 + `…` + últimos 4 chars (ej. `0xABCD…CDEF`) |
| shows disconnect button when connected | Con wallet conectada, el botón con `aria-label="Desconectar wallet"` está en el DOM |
| clicking ✕ calls disconnect | Click en el botón de desconexión llama a `disconnect()` |

---

### `app/routes/__tests__/api.rewards.claimed.test.ts`
**Qué prueba:** el `action` y el `loader` de `app/routes/api.rewards.claimed.tsx`, que marca un claim como `claimed` en D1 con el txHash de la TX onchain.

> Usa `COIN_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479"`. El test de bind verifica `(txHash, timestamp, COIN_ID, user.id)`.

| Test | Descripción |
|---|---|
| returns 401 when unauthenticated | Sin sesión devuelve 401 |
| returns 400 when coinId is missing | Body sin coinId → 400 |
| returns 400 when txHash is missing | Body sin txHash → 400 |
| returns 400 when txHash has invalid format | txHash que no cumple `^0x[0-9a-fA-F]{64}$` → 400 |
| loader returns 405 | GET al endpoint devuelve 405 (Method Not Allowed) |
| runs UPDATE filtering by user_id and status=approved | UPDATE incluye `status = 'approved'` en el WHERE y pasa user_id |
| returns { ok: true } on success | Respuesta 200 con `{ ok: true }` |

---

### `app/routes/__tests__/admin.loader.test.ts`
**Qué prueba:** el `loader` de `app/routes/admin.tsx`, que protege la ruta `/admin`, devuelve los posts y los mensajes del chat global para el usuario admin.

> `~/lib/auth.server` se mockea para controlar la sesión. La DB se simula con `prepare → all` en cadena. `makeDb` usa `mockResolvedValueOnce` dos veces para la primera llamada (posts) y la segunda (chatMessages).

| Test | Descripción |
|---|---|
| throws redirect when unauthenticated | `isAuthenticated` retorna `null` → `Response` 302 |
| throws redirect when user is not admin | Email no coincide con `ADMIN_EMAIL` → `Response` 302 |
| returns user and posts for admin | Admin recibe `{ user, posts }` con los datos de la DB |
| returns empty posts array when DB has no posts | DB devuelve `[]` → `data.posts` es `[]` |
| throws 500 Response when DB fails | `db.prepare().all()` rechaza → `Response` 500 |
| returns chatMessages array in response | `data.chatMessages` existe y es un array |
| returns chatMessages with data from DB | Cuando la segunda llamada a `all()` resuelve con mensajes, éstos aparecen en `data.chatMessages` |

---

### `app/routes/__tests__/admin.action.test.ts`
**Qué prueba:** el `action` de `app/routes/admin.tsx` — intents `delete_post`, `fix_registry_match` y `delete_chat_message`.

> `~/lib/auth.server` se mockea para controlar la sesión. `~/lib/coins` se mockea para inyectar un catálogo controlado de Argentina (1 entrada). La DB se simula con `prepare → { bind → run, all }` y `db.batch` como `vi.fn()`.

| Test | Descripción |
|---|---|
| throws redirect when unauthenticated | Sin sesión activa → `Response` 302 |
| throws redirect when user is not admin | Email no coincide con `ADMIN_EMAIL` → `Response` 302 |
| deletes post and redirects to /admin | `delete_post` con id válido → DB DELETE + redirect 302 |
| redirects without calling DB DELETE for invalid id | `id=0` → redirect 302 sin llamar a `run()` |
| queries all coins from DB for fix_registry_match | `prepare` llamado con `SELECT id, country, denomination, name, year FROM coins` |
| returns { fixed, total } for fix_registry_match | 2 monedas (1 match, 1 no match) → `{ fixed: 1, total: 2 }` |
| fixed=0 when no coin matches the catalog | Moneda con datos inexistentes → `fixed: 0` |
| fixed=1 when one coin matches the catalog | Moneda con datos exactos del mock → `fixed: 1` |
| calls db.batch with UPDATE statements for fix_registry_match | `db.batch` se invoca con el array de UPDATE statements |
| returns 400 for unknown intent | `intent="unknown_intent"` → `{ error: "Acción no reconocida." }` status 400 |
| delete_chat_message: redirects to /admin for valid id | `intent=delete_chat_message` con id válido → redirect 302 a `/admin` |
| delete_chat_message: calls DELETE FROM chat_messages with correct id | `prepare` llamado con `DELETE FROM chat_messages` y `bind(7)` + `run()` |
| delete_chat_message: redirects without calling DELETE for id=0 | `id=0` → redirect 302 sin ejecutar el DELETE |
| delete_chat_message: redirects without calling DELETE for negative id | `id=-1` → redirect 302 sin ejecutar el DELETE |

---

### `app/routes/__tests__/admin_.new-news.test.ts`
**Qué prueba:** el `loader` y el `action` de `app/routes/admin_.new-news.tsx`, que gestiona el formulario de creación de noticias bajo `/admin/new-news`.

> `~/lib/auth.server` se mockea para controlar la sesión. La DB se simula con `prepare → bind → run` en cadena.

#### loader

| Test | Descripción |
|---|---|
| throws redirect when unauthenticated | `isAuthenticated` retorna `null` → `Response` 302 |
| throws redirect when user is not admin | Email no coincide con `ADMIN_EMAIL` → `Response` 302 |
| returns 200 json for admin | Admin recibe respuesta 200 |

#### action

| Test | Descripción |
|---|---|
| throws redirect when unauthenticated | Sin sesión activa → `Response` 302 |
| throws redirect when user is not admin | Email no coincide con `ADMIN_EMAIL` → `Response` 302 |
| returns 400 when title is missing | Título vacío → `{ error: "...obligatorios." }` status 400 |
| returns 400 when body is missing | Cuerpo vacío → mismo error |
| returns 400 when title exceeds 200 chars | Título de 201 caracteres → `{ error: "...200 caracteres." }` status 400 |
| inserts post and redirects to /admin on success | DB INSERT + redirect 302 a `/admin` |
| calls DB INSERT with correct title and body | `prepare` recibe `INSERT INTO posts` y `bind` recibe `(title, body)` |
| returns 500 when DB throws | `run()` rechaza → `{ error: "Error..." }` status 500 |

---

### `app/components/__tests__/WorldMap.test.tsx`
**Qué prueba:** el componente `WorldMap` de `app/components/WorldMap.tsx`, que muestra un mapa coropleta SVG del mundo.

> El TopoJSON se importa directamente desde `public/world-110m.json` (sin fetch en runtime), por lo que no se requiere mock de red. `topojson-client` procesa los datos del import y produce un `FeatureCollection`.

| Test | Descripción |
|---|---|
| renders a container div | El componente monta y produce al menos un elemento DOM |
| renders title when prop is provided | La prop `title` aparece en el DOM como texto |
| renders legend with total pieces when data is provided | Con `coinsByCountry={{ AR: 3, US: 5 }}`, la leyenda muestra "8 piezas" |
| renders legend with singular 'pieza' for count of 1 | Con un único coin, la leyenda usa el singular "1 pieza" |
| does not render legend when coinsByCountry is empty | Sin monedas, la leyenda `<p>` de totales no aparece en el DOM |

---

## Estrategia de mocking

Los tests de rutas no llaman a APIs reales ni crean cookies. Se mockean tres cosas:

- **`~/lib/auth.server`** — se reemplaza `createAuth` con `vi.mock` para controlar qué devuelve `isAuthenticated` o `authenticate` en cada test.
- **`@remix-run/react`** — en tests de componentes que usan `Form`, `useLoaderData` o `useFetcher`, se inyectan valores directamente sin necesitar el router de Remix. El mock de `useFetcher` incluye un `Form` funcional que renderiza un `<form>` nativo real.
- **D1 Database (`DB`)** — se simula con un objeto que encadena `prepare → bind → run/first/all` mediante `vi.fn()`, permitiendo verificar qué queries y valores se envían sin conectar a una base de datos real.
- **R2 Bucket (`IMAGES`)** — se simula con `{ put: vi.fn(), get: vi.fn() }`. El objeto R2 devuelto por `get` implementa `writeHttpMetadata` como `vi.fn()`. Los archivos se crean con la API nativa `File` de happy-dom para probar el flujo completo de upload.

- **`~/lib/rewards.server`** — en tests de rutas (`api.rewards.*`, `admin.rewards.*`) se mockea con `vi.mock` para aislar la lógica onchain. En el test propio de `rewards.server.ts` se mockean `viem` y `viem/accounts` con `vi.hoisted` para controlar `createPublicClient`, `http` y `privateKeyToAccount`.
- **`~/components/ui/CustomSelect`** — en todos los tests de componentes que usan `CustomSelect` se mockea como un `<select>` nativo, manteniendo la API `onChange(value)`. Esto permite usar `getByRole("option")` y `fireEvent.change` estándar sin depender del portal del dropdown.
- **`~/lib/rateLimit.server`** — en tests de acciones que invocan `checkRateLimit` se mockea para retornar `{ allowed: true }` y evitar consultas al DB de rate limiting durante los tests.

Esto mantiene los tests rápidos, deterministas y sin efectos secundarios de red.
