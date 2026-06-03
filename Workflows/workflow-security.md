# Workflow: Seguridad

Analiza los cambios recientes desde la perspectiva de seguridad y actualiza `Docs/security.md`.

---

## Paso 1 — Ver qué cambió

```bash
git diff HEAD~1
```

Leer el diff completo con atención a: loaders, actions, queries SQL, manejo de archivos, sesiones, datos expuestos al cliente.

---

## Paso 2 — Analizar cada cambio en busca de riesgos

Checklist por tipo de cambio:

**Nuevos endpoints o actions**
- ¿Requiere sesión activa? ¿Se valida con `requireUser` o equivalente?
- ¿El método HTTP es correcto (POST para mutaciones, no GET)?

**Queries a D1**
- ¿Usa `.prepare().bind()` con parámetros? (nunca interpolación de strings)
- ¿Filtra por `user_id` para aislar datos por usuario?

**Uploads o acceso a R2**
- ¿Se valida el tipo de archivo (magic bytes, no solo extensión)?
- ¿Hay límite de tamaño?
- ¿Las URLs de R2 son privadas o públicas? ¿Corresponde?

**Loaders que devuelven datos**
- ¿Se filtra información sensible antes de devolver al cliente?
- ¿Se expone `user_id`, emails, o datos internos que no deberían verse?

**Auth / sesiones**
- ¿Cambió la lógica de cookies o `SESSION_SECRET`?
- ¿Se destruye la sesión correctamente en logout?

**Inputs del usuario**
- ¿Se valida longitud, tipo y contenido antes de usar?
- ¿Hay riesgo de XSS en datos que se renderizan como HTML?

---

## Paso 3 — Registrar en `Docs/security.md`

Agregar o actualizar según corresponda:

- Nuevos mecanismos de seguridad implementados
- Nuevas superficies de ataque que el cambio introduce
- Posibles vectores maliciosos identificados (aunque no sean vulnerabilidades confirmadas)
- Cambios en el checklist pre-producción si aplica

---

## Paso 4 — Resumir en el chat

Solo indicar qué se registró en `Docs/security.md`: qué secciones se actualizaron y el hallazgo principal (si lo hubo).
