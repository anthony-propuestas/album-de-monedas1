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
- `/admin` (implementado en `app/routes/admin.tsx`) requiere sesión activa **y** que `user.email` coincida con la variable de entorno `ADMIN_EMAIL`; si falla cualquiera de los dos, redirige a `/`.

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

Los filtros de búsqueda de `/mycollection` también usan placeholders `?` para cada condición dinámica. Nunca se interpola input del usuario directamente en un string de query.

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

## Variables de entorno sensibles

| Variable | Uso | Riesgo si se expone |
|----------|-----|---------------------|
| `GOOGLE_CLIENT_ID` | Identifica la app ante Google | Bajo (es pública en OAuth) |
| `GOOGLE_CLIENT_SECRET` | Autentica la app ante Google | **Alto** — permite impersonar la app |
| `SESSION_SECRET` | Firma las cookies de sesión | **Crítico** — permite forjar sesiones |
| `ADMIN_EMAIL` | Email del único usuario administrador (`/admin`) | **Alto** — permite saber qué cuenta tiene acceso admin |

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
| Sin WAF | Pendiente | Activar Cloudflare WAF en producción (dashboard) |
| Sin rate limiting en `/auth/google` | Pendiente | Regla de rate limit en Cloudflare (dashboard) |
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

---

## Checklist antes de producción

- [ ] `SESSION_SECRET` de al menos 32 caracteres aleatorios.
- [ ] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` configurados en Cloudflare Pages.
- [ ] `ADMIN_EMAIL` configurado en Cloudflare Pages (nunca en el repo).
- [ ] `TURNSTILE_SITE_KEY` y `TURNSTILE_SECRET_KEY` configurados en Cloudflare Pages.
- [ ] Dominio de callback registrado en Google Cloud Console.
- [ ] `secure: true` en cookie (automático si `NODE_ENV=production`).
- [ ] Activar Cloudflare WAF (dashboard).
- [ ] Configurar rate limiting en `/auth/google` (dashboard).
- [x] Implementar `/auth/logout` — `app/routes/auth.logout.tsx`.
- [x] Headers de seguridad (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) en `entry.server.tsx`.
- [ ] Revisar CSP vía Cloudflare Transform Rules.
- [x] Validación de longitud máxima en inputs de perfil y moneda.
- [ ] Validar `country` contra lista ISO y `collecting_since` contra valores del enum antes de escribir en D1.
- [ ] Aplicar principio de mínimo privilegio al binding de D1 en `wrangler.toml` cuando se configure producción.
- [x] Validar `condition` contra enum `MS/AU/XF/VF/F/VG/G/P`.
- [x] Validar `denomination` y `name` de moneda contra `COINS_BY_COUNTRY[country]`.
- [x] Rechazar `name` vacío en el action de `/mycollection`.
- [x] Magic bytes JPEG y límite de 5 MB antes de subir a R2.
- [x] Límite de 500 monedas por usuario.
