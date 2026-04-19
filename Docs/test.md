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
| returns user data when the session is valid | Si `isAuthenticated` devuelve un usuario, el loader retorna `{ user }` |
| calls isAuthenticated with the incoming request | El request original se pasa a `isAuthenticated` tal cual |
| calls createAuth with the cloudflare env | `createAuth` recibe solo el env (sin request) para la verificación de sesión |

---

### `app/routes/__tests__/home.component.test.tsx`
**Qué prueba:** el componente React `Home` de `app/routes/home.tsx`.

> `useLoaderData` se mockea para inyectar un usuario de prueba sin necesitar el contexto de Remix.

| Test | Descripción |
|---|---|
| renders the welcome message with the user's name | Muestra "Bienvenido, {nombre}" con el nombre del usuario |
| renders all three navigation cards | Las tres cards (Mi colección, Grandes colecciones, Mercados) están en el DOM |
| navigation cards point to the correct hrefs | Los links apuntan a `/collection`, `/collections` y `/markets` |
| renders the app brand name | El nombre "Album de Monedas" está visible |

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

## Estrategia de mocking

Los tests de rutas no llaman a APIs reales ni crean cookies. Se mockean dos cosas:

- **`~/lib/auth.server`** — se reemplaza `createAuth` con `vi.mock` para controlar qué devuelve `isAuthenticated` o `authenticate` en cada test.
- **`@remix-run/react`** — en tests de componentes que usan `Form` o `useLoaderData`, se inyectan valores directamente sin necesitar el router de Remix.

Esto mantiene los tests rápidos, deterministas y sin efectos secundarios de red.
