# Seguridad — Album de Monedas

Estado actual: MVP con autenticación Google OAuth funcional, base de datos D1 (perfil de usuario + colección de monedas) y almacenamiento de imágenes en R2.

---

## Autenticación

### Flujo OAuth Google

1. El usuario hace POST a `/auth/google` (form de Remix).
2. `remix-auth` redirige al servidor de Google con los scopes `openid email profile`.
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
- `/images/*` no requiere sesión: las claves R2 tienen el formato `{userId}/{coinId}/{slot}` donde `coinId` es un UUID v4, haciendo las URLs no adivinables por fuerza bruta.

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
- El `action` de `/mycollection` requiere que `intent === "add_coin"` y que el campo `name` tenga valor. Los campos opcionales se almacenan como `null` si están vacíos, nunca como string vacío.

### Almacenamiento de imágenes en R2

- La clave de cada imagen es `{userId}/{coinId}/{slot}` — el `coinId` es un UUID v4 generado en el servidor, haciendo las claves no predecibles.
- Antes de subirse, cada foto pasa por el editor `ImageCropEditor`: el navegador la redibuja en un `<canvas>` 512×512 y la exporta con `canvas.toBlob(..., "image/jpeg", 0.92)`. Esto significa que el archivo que llega al servidor **siempre es un JPEG re-encodado**, independientemente del formato original (PNG, HEIC, WebP, etc.). El `contentType` enviado a R2 es `"image/jpeg"` en todos los casos.
- Esto mitiga parcialmente el riesgo de tipo MIME: el servidor recibe JPEG en lugar del tipo declarado por el navegador. Sin embargo, no se validan magic bytes server-side ni se limita el tamaño antes de llamar a R2.
- No existe límite de tamaño de archivo enforced en el servidor más allá del límite de Cloudflare Pages Functions (100 MB por request).

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
| `country`, `condition` | Input de formulario (valores libres) | Bajo — pendiente validación contra enum |
| `year`, `estimated_value` | Input numérico, parseado con `parseInt`/`parseFloat` | Bajo — NaN se convierte en `null` antes de guardar |
| `photo_*` | Clave R2 generada en servidor | Ninguno — el cliente nunca decide el nombre del archivo |

---

## Módulos de datos de monedas y dropdowns en cascada

### Naturaleza de los datos

Los módulos `app/lib/coins/argentina.ts` y `app/lib/coins/index.ts` son **archivos TypeScript estáticos** compilados en el bundle del cliente en tiempo de build. No hay fetch a ninguna API externa, no hay lectura de archivos en runtime y no existe superficie de ataque de inyección de datos externos.

### Validación: cliente vs. servidor

Los dropdowns en cascada (País → Denominación → Nombre → Año → Casa de Acuñación) son **exclusivamente client-side**. El servidor (`action` de `mycollection.tsx`) recibe los campos `denomination`, `name`, `year` y `mint` como strings de un POST multipart ordinario, sin validar su contenido contra los módulos.

**Consecuencia:** un atacante puede enviar una request HTTP directa con valores arbitrarios para `denomination`, `name` y `mint`, saltándose completamente los dropdowns. El campo `readOnly` del input `mint` es puramente cosmético — el servidor no lo verifica.

Esto es consistente con el comportamiento preexistente de `country` y `condition`, que tampoco se validan contra sus listas de referencia en el servidor.

### Riesgos introducidos

Ninguna superficie de ataque nueva. En particular:

- No hay llamadas a APIs externas ni fetches desde el cliente para cargar los datos.
- No se abre ningún endpoint nuevo.
- Los datos de los módulos no pasan por el servidor; son constantes del bundle.
- Las queries D1 del action siguen usando `.bind()` parametrizado — el valor de `mint` autorrelleno llega como string normal y se almacena de la misma forma que antes.

### Riesgo pendiente añadido

| Riesgo | Estado | Mitigación recomendada |
|--------|--------|------------------------|
| Sin validación server-side de `denomination`, `name` y `mint` contra los módulos | Pendiente | En el `action` de `/mycollection`, verificar que `denomination` y `name` pertenecen al módulo del país seleccionado cuando `COINS_BY_COUNTRY[country]` existe; rechazar con 400 si no coinciden |

---

## Variables de entorno sensibles

| Variable | Uso | Riesgo si se expone |
|----------|-----|---------------------|
| `GOOGLE_CLIENT_ID` | Identifica la app ante Google | Bajo (es pública en OAuth) |
| `GOOGLE_CLIENT_SECRET` | Autentica la app ante Google | **Alto** — permite impersonar la app |
| `SESSION_SECRET` | Firma las cookies de sesión | **Crítico** — permite forjar sesiones |

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

| Riesgo | Estado | Mitigación recomendada |
|--------|--------|------------------------|
| Sin protección anti-bot en login | Pendiente | Implementar Cloudflare Turnstile |
| Sin WAF | Pendiente | Activar Cloudflare WAF en producción |
| Sin rate limiting en `/auth/google` | Pendiente | Regla de rate limit en Cloudflare |
| Sin CSRF token explícito | Aceptado (Remix) | `sameSite: lax` mitiga casos comunes; Remix Forms incluye protección nativa |
| Sin logout implementado | Pendiente | Añadir ruta `/auth/logout` que destruya la sesión |
| Sin scope mínimo verificado | Pendiente | Verificar que solo se solicitan `openid email profile` |
| Sin validación de longitud máxima en inputs de perfil/moneda | Pendiente | Añadir límite de caracteres en `name`, `notes`, `goals` para prevenir payloads gigantes en D1 |
| Sin validación de valores permitidos en `country` y `condition` de monedas | Pendiente | Verificar `country` contra la lista ISO y `condition` contra el enum `MS/AU/XF/VF/F/VG/G/P` en el action |
| Sin validación server-side de `denomination`, `name` y `mint` contra los módulos de monedas | Pendiente | Cuando `COINS_BY_COUNTRY[country]` existe, verificar que `denomination` y `name` son valores del módulo; rechazar con 400 si no coinciden |
| Sin validación server-side del tipo MIME de imágenes | Parcialmente mitigado | El canvas re-encodea siempre a JPEG antes del upload; falta verificar magic bytes server-side como segunda línea de defensa |
| Sin límite de tamaño de archivo enforced | Pendiente | Validar `file.size` en el action (ej. máx. 5 MB por foto) antes de llamar a R2 |
| Sin control de cuántas monedas puede crear un usuario | Pendiente | Añadir límite por `user_id` en el action de `/mycollection` para prevenir abuso de almacenamiento |
| Imágenes R2 accesibles sin autenticación | Aceptado | Las claves contienen UUIDs no predecibles; considerar signed URLs si se requiere mayor restricción |

---

## Checklist antes de producción

- [ ] `SESSION_SECRET` de al menos 32 caracteres aleatorios.
- [ ] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` configurados en Cloudflare Pages.
- [ ] Dominio de callback registrado en Google Cloud Console.
- [ ] `secure: true` en cookie (automático si `NODE_ENV=production`).
- [ ] Activar Cloudflare WAF y Turnstile.
- [ ] Implementar `/auth/logout`.
- [ ] Revisar headers de seguridad (CSP, HSTS) vía Cloudflare o middleware.
- [ ] Añadir validación de longitud máxima en `name` y `goals` en el action de `/home`.
- [ ] Validar `country` contra la lista de códigos ISO y `collecting_since` contra los valores del enum antes de escribir en D1.
- [ ] Aplicar principio de mínimo privilegio al binding de D1 en `wrangler.toml` cuando se configure producción.
- [ ] Validar `country` de monedas contra la lista ISO y `condition` contra el enum `MS/AU/XF/VF/F/VG/G/P` en el action de `/mycollection`.
- [ ] Cuando `COINS_BY_COUNTRY[country]` existe, validar server-side que `denomination` y `name` son valores reconocidos del módulo antes de escribir en D1.
- [ ] Añadir validación de magic bytes server-side (el canvas garantiza JPEG, pero una segunda verificación es recomendable) y límite de tamaño máximo por foto antes de subir a R2.
- [ ] Definir un límite de monedas por usuario para prevenir abuso de almacenamiento en D1 y R2.
