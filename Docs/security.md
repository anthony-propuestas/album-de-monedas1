# Seguridad — Album de Monedas

Estado actual: MVP con autenticación Google OAuth funcional.

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

- `home.tsx` llama a `authenticator.isAuthenticated(request)` y lanza `redirect("/")` si no hay sesión.
- Las rutas `/auth/google` y `/auth/google/callback` no requieren sesión.

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
| D1/R2 sin implementar | N/A | Aplicar principio de mínimo privilegio cuando se conecte |

---

## Checklist antes de producción

- [ ] `SESSION_SECRET` de al menos 32 caracteres aleatorios.
- [ ] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` configurados en Cloudflare Pages.
- [ ] Dominio de callback registrado en Google Cloud Console.
- [ ] `secure: true` en cookie (automático si `NODE_ENV=production`).
- [ ] Activar Cloudflare WAF y Turnstile.
- [ ] Implementar `/auth/logout`.
- [ ] Revisar headers de seguridad (CSP, HSTS) vía Cloudflare o middleware.
