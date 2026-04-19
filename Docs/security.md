# Seguridad — Album de Monedas

Estado actual: MVP con autenticación Google OAuth funcional y base de datos D1 (perfil de usuario).

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

- `home.tsx` llama a `authenticator.isAuthenticated(request)` tanto en el `loader` como en el `action`, y lanza `redirect("/")` si no hay sesión. Esto evita que un request directo al endpoint de perfil omita la autenticación.
- Las rutas `/auth/google` y `/auth/google/callback` no requieren sesión.

---

## Base de datos D1

### Queries parametrizadas

Todas las interacciones con D1 usan el método `.bind()` de la API de D1, que separa la query del dato y previene SQL injection:

```ts
db.prepare("SELECT profile_completed FROM users WHERE id = ?").bind(user.id).first()
db.prepare("INSERT INTO users (id, email, name, picture) VALUES (?, ?, ?, ?)").bind(...).run()
db.prepare("UPDATE users SET name = ?, country = ?, ... WHERE id = ?").bind(...).run()
```

Nunca se interpola input del usuario directamente en un string de query.

### Validación de entrada en el action

El `action` de `/home` valida que `name`, `country`, `collecting_since` y `goals` sean strings no vacíos (tras `.trim()`) antes de escribir en la DB. Si falta cualquiera, retorna `{ error }` sin tocar la base de datos.

### Datos almacenados

| Campo | Fuente | Riesgo |
|-------|--------|--------|
| `id`, `email`, `name`, `picture` | Token OAuth de Google (servidor) | Bajo — datos verificados por Google |
| `country`, `collecting_since` | Input de formulario | Bajo — validado como no vacío; React escapa al renderizar |
| `goals` | Input de formulario (comma-separated) | Bajo — mismo tratamiento; no se ejecuta como código |
| `profile_completed` | Servidor (siempre `1` en UPDATE) | Ninguno — el cliente no puede enviarlo directamente |

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
| Sin validación de longitud máxima en inputs de perfil | Pendiente | Añadir límite de caracteres en `name` y `goals` para prevenir payloads gigantes en D1 |
| Sin validación de valores permitidos en `country` y `collecting_since` | Pendiente | Verificar contra la lista de valores válidos (enum) en el action |
| R2 + Cloudflare Images sin implementar | N/A | Aplicar principio de mínimo privilegio cuando se conecte |

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
