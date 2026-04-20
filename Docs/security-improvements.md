# Plan de mejoras de seguridad

Ítems extraídos de `security.md`, ordenados por prioridad. Cada uno es autocontenido: incluye qué archivo tocar, qué cambiar y cómo verificarlo.

---

## Crítico — bloquea producción

### [ ] 1. Implementar `/auth/logout`

**Archivo:** `app/routes/auth.logout.tsx` (nuevo)

`remix-auth` no expone un método `logout()` en `Authenticator`. La forma correcta es destruir la sesión manualmente. `createAuth()` ya retorna `sessionStorage`, así que:

```ts
import { redirect } from "@remix-run/cloudflare";
import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { createAuth } from "~/lib/auth.server";

export async function action({ request, context }: ActionFunctionArgs) {
  const { sessionStorage } = createAuth(context.cloudflare.env);
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  return redirect("/", {
    headers: { "Set-Cookie": await sessionStorage.destroySession(session) },
  });
}
```

Añadir un `<Form method="post" action="/auth/logout">` con botón en el header de `/home` y `/mycollection`.

**Verificar:** iniciar sesión, hacer logout, confirmar que `/home` redirige a `/`.

---

### [ ] 2. Validar `name` no vacío en el action de `/mycollection`

**Archivo:** `app/routes/mycollection.tsx`, línea ~97

```ts
const name = form.get("name")?.toString().trim() ?? "";
if (!name) return json({ error: "El nombre es obligatorio." }, { status: 400 });
```

**Verificar:** POST directo a `/mycollection` con `name=""` debe devolver 400.

---

### [ ] 3. Validar tamaño máximo de archivo antes de subir a R2

**Archivo:** `app/routes/mycollection.tsx`, función `uploadPhoto`

```ts
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
if (file.size > MAX_PHOTO_BYTES) return null; // o retornar error al caller
```

Si se quiere reportar el error al usuario, extraer `uploadPhoto` fuera del closure y retornar un objeto `{ key, error }`.

**Verificar:** subir imagen >5 MB y confirmar que se rechaza sin llegar a R2.

---

### [ ] 4. Especificar scopes OAuth explícitamente en `GoogleStrategy`

**Archivo:** `app/lib/auth.server.ts`

```ts
new GoogleStrategy<UserProfile>(
  {
    clientID: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    callbackURL,
    scope: ["openid", "email", "profile"],
  },
  async ({ profile }) => ({ ... })
)
```

**Verificar:** flujo OAuth completo funciona; en el callback `profile.emails` y `profile.photos` siguen disponibles.

---

## Alta prioridad — implementar antes de usuarios reales

### [ ] 5. Límite de monedas por usuario

**Archivo:** `app/routes/mycollection.tsx`, action `add_coin`, antes del INSERT

```ts
const MAX_COINS = 500;
const row = await db
  .prepare("SELECT COUNT(*) as count FROM coins WHERE user_id = ?")
  .bind(user.id)
  .first<{ count: number }>();
const coinCount = row?.count ?? 0;
if (coinCount >= MAX_COINS) {
  return json({ error: "Límite de monedas alcanzado." }, { status: 429 });
}
```

`.first()` retorna `T | null`; la desestructuración directa crashea si retorna `null` (aunque COUNT(*) siempre retorna fila, TypeScript no lo sabe).

**Verificar:** crear 500 monedas (o ajustar el límite para test) y confirmar que la 501 devuelve 429.

---

### [ ] 6. Validar longitud máxima de inputs de texto

**Archivo:** `app/routes/home.tsx` (action) y `app/routes/mycollection.tsx` (action)

En `/home`:
```ts
if (name.length > 100 || goals.length > 500) {
  return json({ error: "Texto demasiado largo." }, { status: 400 });
}
```

En `/mycollection`:
```ts
if (name.length > 200 || (notes && notes.length > 1000)) {
  return json({ error: "Texto demasiado largo." }, { status: 400 });
}
```

**Verificar:** POST con `name` de 10 000 chars debe devolver 400.

---

### [ ] 7. Validar `denomination` y `name` de moneda contra `COINS_BY_COUNTRY`

**Archivo:** `app/routes/mycollection.tsx`, action `add_coin`

```ts
import { COINS_BY_COUNTRY } from "~/lib/coins";

const coinsForCountry = country ? COINS_BY_COUNTRY[country] : null;
if (coinsForCountry) {
  const validDenominations = [...new Set(coinsForCountry.map(c => c.denominacion))];
  if (denomination && !validDenominations.includes(denomination)) {
    return json({ error: "Denominación inválida." }, { status: 400 });
  }
  const validNames = coinsForCountry
    .filter(c => !denomination || c.denominacion === denomination)
    .map(c => c.nombre);
  if (name && !validNames.includes(name)) {
    return json({ error: "Nombre de moneda inválido." }, { status: 400 });
  }
}
```

Solo aplica cuando el país existe en el módulo; países sin módulo pasan libremente.

**Verificar:** POST con `country=AR`, `denomination="Peso Falso"` debe devolver 400; con valores válidos debe insertar correctamente.

---

### [ ] 8. Validar `condition` contra enum permitido

**Archivo:** `app/routes/mycollection.tsx`, action

```ts
const VALID_CONDITIONS = ["MS", "AU", "XF", "VF", "F", "VG", "G", "P"] as const;
if (condition && !(VALID_CONDITIONS as readonly string[]).includes(condition)) {
  return json({ error: "Condición inválida." }, { status: 400 });
}
```

El cast `condition as typeof VALID_CONDITIONS[number]` no compila porque `condition` es `string`; la forma correcta es ampliar el tipo del array.

**Verificar:** POST con `condition="asdf"` debe devolver 400.

---

## Prioridad media — infraestructura Cloudflare

### [ ] 9. Activar Cloudflare WAF

En el dashboard de Cloudflare → Security → WAF:
- Activar "Managed Rules" (Cloudflare Managed Ruleset).
- Activar regla de protección contra SQLi y XSS.

**Verificar:** no es verificable en local; revisar el traffic log en el dashboard después del deploy.

---

### [ ] 10. Rate limiting en `/auth/google`

En Cloudflare → Security → WAF → Rate Limiting:
- Path: `/auth/google`
- Método: POST
- Umbral: 10 requests / 60 segundos por IP
- Acción: bloquear durante 5 minutos

**Verificar:** enviar 11 POSTs seguidos a `/auth/google` desde la misma IP; el 11.º debe recibir 429.

---

### [ ] 11. Protección anti-bot con Cloudflare Turnstile en el login

**Archivo:** `app/routes/_index.tsx` (formulario de login)

1. Crear widget Turnstile en el dashboard de Cloudflare → Turnstile.
2. Añadir el script y el widget `<div class="cf-turnstile" ...>` al form.
3. En `app/routes/auth.google.tsx` (action), verificar el token antes de redirigir. **Problema:** `authenticate()` necesita leer el `request.body` (stream), que solo puede consumirse una vez. Si se llama `request.formData()` primero, `authenticate()` falla. Solución: clonar el request antes de leerlo:

```ts
export async function action({ request, context }: ActionFunctionArgs) {
  const { authenticator } = createAuth(context.cloudflare.env, request);

  // Clonar antes de leer para no consumir el stream que necesita authenticate()
  const form = await request.clone().formData();
  const token = form.get("cf-turnstile-response")?.toString();
  const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({
      secret: context.cloudflare.env.TURNSTILE_SECRET_KEY,
      response: token ?? "",
    }),
  });
  const { success } = await result.json<{ success: boolean }>();
  if (!success) throw redirect("/");

  return authenticator.authenticate("google", request, {
    successRedirect: "/home",
    failureRedirect: "/",
  });
}
```

4. Añadir `TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY` a `.dev.vars` y a Cloudflare Pages.

**Verificar:** intentar login sin completar el captcha no debe redirigir a Google.

---

## Baja prioridad — mejora incremental

### [ ] 12. Verificar magic bytes del archivo en el servidor

**Archivo:** `app/routes/mycollection.tsx`, función `uploadPhoto`

```ts
const buffer = await file.arrayBuffer();
const bytes = new Uint8Array(buffer);
// JPEG: empieza con FF D8 FF
if (bytes[0] !== 0xFF || bytes[1] !== 0xD8 || bytes[2] !== 0xFF) return null;
await images.put(key, buffer, { httpMetadata: { contentType: "image/jpeg" } });
```

Esto también permite fijar el `contentType` a `"image/jpeg"` de forma segura en lugar de usar `file.type`.

**Verificar:** subir un PNG/GIF directamente (bypaseando el canvas) debe ser rechazado; subir JPEG válido debe funcionar.

---

### [ ] 13. Headers de seguridad (CSP, HSTS, X-Frame-Options)

**Opción A — Cloudflare Transform Rules** (recomendada): añadir headers en el dashboard → Rules → Transform Rules → Modify Response Header. No requiere cambios de código y no interactúa con el SSR.

**Opción B — `entry.server.tsx`**: `X-Frame-Options` y `X-Content-Type-Options` son seguros. **No usar `Content-Security-Policy` aquí sin `'unsafe-inline'`**: Remix inyecta scripts inline para la hidratación (`__remixContext`) que una CSP estricta bloquearía, rompiendo la app en el cliente.

```ts
// entry.server.tsx — solo headers que no rompen Remix
responseHeaders.set("X-Frame-Options", "DENY");
responseHeaders.set("X-Content-Type-Options", "nosniff");
responseHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
// CSP: agregar solo desde Cloudflare Transform Rules donde se puede ajustar sin redeployar
```

**Verificar:** `curl -I https://tudominio.pages.dev` debe mostrar los headers; abrir la app en el navegador y confirmar que React hidrata correctamente (no hay errores en la consola).

---

### [ ] 14. `ADMIN_EMAIL` en Cloudflare Pages (no en el repo)

Confirmar que `.dev.vars` contiene `ADMIN_EMAIL` para local y que está configurado en el dashboard de Cloudflare Pages para producción. El valor nunca debe commitearse.

---

## Orden de implementación recomendado

| # | Ítem | Esfuerzo |
|---|------|----------|
| 1 | Logout | ~15 min |
| 2 | `name` vacío en coins | ~5 min |
| 3 | Límite de tamaño de archivo | ~10 min |
| 4 | Scopes OAuth explícitos | ~5 min |
| 5 | Límite de monedas por usuario | ~15 min |
| 6 | Longitud máxima de inputs | ~10 min |
| 7 | Validación denomination/name | ~20 min |
| 8 | Validación condition | ~5 min |
| 9 | WAF Cloudflare | ~10 min (dashboard) |
| 10 | Rate limiting | ~10 min (dashboard) |
| 11 | Turnstile | ~45 min |
| 12 | Magic bytes | ~15 min |
| 13 | Headers CSP/HSTS | ~20 min |
| 14 | ADMIN_EMAIL en Pages | ~5 min |
