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
**Qué prueba:** el `loader` de `app/routes/home.tsx`, que protege la ruta `/home`, devuelve el usuario autenticado y ejecuta 3 queries de stats personales en paralelo.

> El módulo `~/lib/auth.server` se mockea completamente para controlar el resultado de `isAuthenticated` sin necesidad de cookies reales. Para los tests de stats se usa `makeMockDbWithStats`, que encadena `mockResolvedValueOnce` para controlar el resultado de cada una de las 4 llamadas a `first()` por separado.

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
| makes 4 DB prepare calls for an existing user | Para un usuario existente, `db.prepare` se invoca 4 veces: `SELECT profile_completed` + 3 stats |
| makes 5 DB prepare calls for a new user (INSERT included) | Para un usuario nuevo, `db.prepare` se invoca 5 veces: `SELECT` + `INSERT` + 3 stats |
| response includes all three stats fields | La respuesta contiene `{ total, estimatedValue, topCondition }` con los valores correctos de la DB |

---

### `app/routes/__tests__/home.component.test.tsx`
**Qué prueba:** el componente React `Home` de `app/routes/home.tsx`.

> `useLoaderData` y `useFetcher` se mockean para inyectar estado sin necesitar el contexto de Remix.

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
| returns error for unknown intent | Si `intent` no es `complete_profile`, retorna `{ error: "Acción no reconocida." }` |
| returns error when name is missing | Campo `name` vacío → `{ error: "Todos los campos son obligatorios." }` |
| returns error when country is missing | Campo `country` vacío → mismo error de validación |
| returns error when goals is missing | Campo `goals` vacío → mismo error de validación |
| returns { success: true } when all fields are provided | Con todos los campos válidos retorna `{ success: true }` |
| calls DB UPDATE with correct field values | Verifica que `prepare` recibe la query UPDATE y `bind` los 5 valores en orden correcto |
| does not call DB when validation fails | Si la validación falla, `run()` no se llama nunca |
| trims whitespace from fields | Los espacios al inicio/fin se recortan antes de guardar en la DB |

---

### `app/routes/__tests__/auth.google.test.ts`
**Qué prueba:** el `action` de `app/routes/auth.google.tsx`, que inicia el flujo OAuth de Google.

> `~/lib/auth.server` se mockea para interceptar la llamada a `authenticate` sin realizar llamadas reales a Google.

| Test | Descripción |
|---|---|
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
| renders the Google login button | El botón "Iniciar sesión con Google" está en el DOM |
| login form POSTs to /auth/google | El formulario tiene `method="post"` y `action="/auth/google"` |
| renders 'Cómo funciona' section | La sección explicativa está renderizada |
| renders all three onboarding steps | Los tres pasos (Crea tu cuenta, Sube tus monedas, Conecta y comparte) |
| renders step numbers 01, 02, 03 | Los números de paso se muestran en orden |
| renders the app description text | El texto descriptivo menciona "colección numismática" |

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
| renders all three reason cards | Las tres tarjetas (Compite en rankings, Monedas de todo el mundo, Comunidad activa) están presentes |
| renders reason card descriptions | Los textos de las tarjetas mencionan "leaderboards", "denominación" y "numismáticos" |

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

---

### `app/routes/__tests__/mycollection.action.test.ts`
**Qué prueba:** el `action` de `app/routes/mycollection.tsx`, que recibe el formulario multipart, sube fotos a R2 e inserta la moneda en D1.

> `~/lib/auth.server` se mockea para la sesión. DB y R2 se simulan con `vi.fn()`. Los archivos se crean con la API nativa `File` disponible en happy-dom.

| Test | Descripción |
|---|---|
| throws redirect to '/' when unauthenticated | Sin sesión activa, el action lanza `Response` 302 → `/` |
| returns 400 for unknown intent | Si `intent` no es `add_coin`, retorna `{ error: "Acción no reconocida." }` con status 400 |
| redirects to /mycollection after successful insert | Con intent y nombre válidos, retorna `Response` 302 → `/mycollection` |
| calls DB INSERT with user_id and coin name | Verifica que `prepare` recibe `INSERT INTO coins` y `bind` contiene `user.id` y el nombre |
| stores null for all photos when IMAGES binding is absent | Sin binding R2, los cuatro slots de foto se guardan como `null` en D1 |
| uploads photo_obverse to R2 and stores its key in DB | Con binding R2 y un `File` no vacío, llama a `images.put` con el key correcto y guarda ese key en D1 |
| parses year as integer and estimated_value as float | Los campos numéricos se convierten antes de guardar (`parseInt`, `parseFloat`) |
| stores null for empty optional text fields | Los campos opcionales no enviados se guardan como `null`, no como string vacío |
| does not upload to R2 when file is empty | Un `File` de 0 bytes no dispara `images.put` |

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
| all years are within reasonable range (2000–2030) | Todos los `anio` están entre 2000 y 2030 inclusive |
| contains the expected denominations | Las 8 denominaciones (5 Centavos, 10 Centavos, 25 Centavos, 50 Centavos, 1 Peso, 2 Pesos, 5 Pesos, 10 Pesos) están presentes |
| Serie 2 names appear for the correct denominations | "Un Peso — Jacarandá" pertenece a `1 Peso`; "Diez Pesos — Caldén" pertenece a `10 Pesos` |
| filtering by denomination returns only matching entries | `filter(c => c.denominacion === "1 Peso")` devuelve solo entradas de esa denominación |
| filtering by nombre returns matching years in order | Los años de "Un Peso — Jacarandá" comienzan en 2018 y están ordenados |
| find returns the exact coin for a given nombre + anio | Buscar "Un Peso — Jacarandá" + 2021 devuelve la entrada correcta con `casa_acunacion` y `denominacion` correctos |
| no duplicate (nombre + anio) pairs | No existen dos entradas con el mismo `nombre` y `anio` simultáneamente |

---

### `app/components/__tests__/AddCoinModal.test.tsx`
**Qué prueba:** el componente `AddCoinModal` de `app/components/AddCoinModal.tsx`, incluyendo el flujo de selección de foto, apertura del editor de crop, actualización del preview circular y los dropdowns en cascada alimentados por módulos de datos de monedas.

> `@remix-run/react` se mockea (Form + useNavigation). `ImageCropEditor` se reemplaza por un stub que expone botones `mock-confirm` y `mock-cancel`. `URL.createObjectURL/revokeObjectURL` y `DataTransfer` se mockean.

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
| shows 'Guardando...' while submitting | Con `navigation.state="submitting"`, el botón muestra "Guardando..." |
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
| Argentina denomination select has all expected options | El select de denominación incluye las 8 denominaciones del módulo de Argentina |
| name remains free-text after selecting country but before selecting denomination | Con país pero sin denominación, `name` sigue siendo `<input>` libre |
| selecting a denomination converts name to a select | Al elegir una denominación, `name` se convierte en `<select>` |
| name select options match coins of the selected denomination | Las opciones de `name` corresponden exactamente a los nombres del módulo filtrados por la denominación elegida |
| selecting a name converts year to a select | Al elegir un nombre, `year` se convierte en `<select>` |
| year select options match the years for the selected coin name | Las opciones de `year` corresponden a los años del módulo filtrados por el nombre elegido |
| mint auto-fills and is read-only after selecting a complete chain | Al completar País → Denominación → Nombre → Año, el campo `mint` muestra `"Casa de Moneda de la Argentina"` y tiene `readOnly=true` |
| mint is empty before completing the chain | Sin una selección completa, `mint` está vacío y no es read-only |
| changing country resets denomination, name and year to free inputs | Cambiar el país limpia todos los campos inferiores y los devuelve a inputs libres |
| changing denomination resets name and year | Cambiar la denominación limpia `name` y elimina el `<select>` de `year` |

---

### `app/components/__tests__/CoinCard.test.tsx`
**Qué prueba:** el componente `CoinCard` de `app/components/CoinCard.tsx`, que muestra la tarjeta de una moneda en la galería.

| Test | Descripción |
|---|---|
| renders coin name | El nombre de la moneda aparece en el DOM |
| shows 'Sin foto' placeholder when no photo_obverse | Sin `photo_obverse`, se muestra el placeholder "Sin foto" |
| renders img with correct /images/ src when photo_obverse is set | Con `photo_obverse`, el `<img>` tiene `src="/images/{key}"` |
| renders alt text for obverse image | El `<img>` tiene alt `"Anverso de {nombre}"` |
| renders country and year separated by · | País y año aparecen como `"MX · 1964"` |
| renders only country when year is null | Sin año, solo se muestra el país |
| renders only year when country is null | Sin país, solo se muestra el año |
| shows denomination when present | La denominación se renderiza cuando tiene valor |
| does not render denomination element when null | La denominación no aparece si es `null` |
| shows condition badge with the condition value | El badge muestra el código de condición (`MS`, `VF`, etc.) |
| does not render condition badge when condition is null | Sin condición, no hay badge |
| renders condition badge for grade X (×8) | Cada uno de los 8 grados (`MS`, `AU`, `XF`, `VF`, `F`, `VG`, `G`, `P`) renderiza su badge |
| renders placeholder icon when no photo | Sin foto, no hay `<img>` en el DOM |
| image is wrapped inside a rounded-full container | Con foto, el `<img>` está dentro de un elemento con clase `rounded-full` |
| placeholder is inside the rounded-full container | Sin foto, el texto "Sin foto" está dentro del contenedor `rounded-full` |

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

## Estrategia de mocking

Los tests de rutas no llaman a APIs reales ni crean cookies. Se mockean tres cosas:

- **`~/lib/auth.server`** — se reemplaza `createAuth` con `vi.mock` para controlar qué devuelve `isAuthenticated` o `authenticate` en cada test.
- **`@remix-run/react`** — en tests de componentes que usan `Form`, `useLoaderData` o `useFetcher`, se inyectan valores directamente sin necesitar el router de Remix. El mock de `useFetcher` incluye un `Form` funcional que renderiza un `<form>` nativo real.
- **D1 Database (`DB`)** — se simula con un objeto que encadena `prepare → bind → run/first/all` mediante `vi.fn()`, permitiendo verificar qué queries y valores se envían sin conectar a una base de datos real.
- **R2 Bucket (`IMAGES`)** — se simula con `{ put: vi.fn(), get: vi.fn() }`. El objeto R2 devuelto por `get` implementa `writeHttpMetadata` como `vi.fn()`. Los archivos se crean con la API nativa `File` de happy-dom para probar el flujo completo de upload.

Esto mantiene los tests rápidos, deterministas y sin efectos secundarios de red.
