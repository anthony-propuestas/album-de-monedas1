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
**Qué prueba:** el `loader` de `app/routes/home.tsx`, que protege la ruta `/home` y devuelve el usuario autenticado.

> El módulo `~/lib/auth.server` se mockea completamente para controlar el resultado de `isAuthenticated` sin necesidad de cookies reales.

| Test | Descripción |
|---|---|
| throws a redirect to '/' when user is not authenticated | Si `isAuthenticated` devuelve `null`, el loader lanza un `Response` 302 → `/` |
| returns user data and profileCompleted=false for a new user | Usuario nuevo (sin perfil completo) retorna `{ user, profileCompleted: false }` |
| returns profileCompleted=true for a returning user with complete profile | Usuario con perfil completo retorna `{ user, profileCompleted: true }` |
| calls isAuthenticated with the incoming request | El request original se pasa a `isAuthenticated` tal cual |
| calls createAuth with the cloudflare env | `createAuth` recibe solo el env (sin request) para la verificación de sesión |

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

> El componente `Form` de `@remix-run/react` se reemplaza por un `<form>` nativo para evitar la dependencia del router de Remix.

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

## Estrategia de mocking

Los tests de rutas no llaman a APIs reales ni crean cookies. Se mockean tres cosas:

- **`~/lib/auth.server`** — se reemplaza `createAuth` con `vi.mock` para controlar qué devuelve `isAuthenticated` o `authenticate` en cada test.
- **`@remix-run/react`** — en tests de componentes que usan `Form`, `useLoaderData` o `useFetcher`, se inyectan valores directamente sin necesitar el router de Remix. El mock de `useFetcher` incluye un `Form` funcional que renderiza un `<form>` nativo real.
- **D1 Database (`DB`)** — se simula con un objeto que encadena `prepare → bind → run/first/all` mediante `vi.fn()`, permitiendo verificar qué queries y valores se envían sin conectar a una base de datos real.
- **R2 Bucket (`IMAGES`)** — se simula con `{ put: vi.fn(), get: vi.fn() }`. El objeto R2 devuelto por `get` implementa `writeHttpMetadata` como `vi.fn()`. Los archivos se crean con la API nativa `File` de happy-dom para probar el flujo completo de upload.

Esto mantiene los tests rápidos, deterministas y sin efectos secundarios de red.
