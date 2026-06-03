# Workflow: Comparación código vs documentación

Detecta desfases entre el código real y los documentos de documentación, y los presenta al usuario para decidir cómo resolverlos.

---

## Documentos de documentación del proyecto

- `README.md`
- `CLAUDE.md`
- `Docs/data.md`
- `Docs/test.md`
- `Docs/security.md`

---

## Paso 1 — Leer todos los documentos

Leer cada uno de los 5 documentos listados arriba.

---

## Paso 2 — Verificar contra el código real

### README.md
- ¿Las rutas listadas en la tabla coinciden exactamente con los archivos en `app/routes/`?
- ¿El stack y versiones mencionadas corresponden a `package.json`?
- ¿Los comandos documentados funcionan con los scripts actuales de `package.json`?

### CLAUDE.md (sección Arquitectura)
- ¿Los archivos listados en `app/routes/`, `app/components/`, `app/lib/` existen realmente?
- ¿Hay archivos nuevos en esas carpetas que no están listados?
- ¿Los bindings de Cloudflare en `wrangler.toml` coinciden con lo documentado?

### Docs/data.md
- ¿Las tablas del schema coinciden con los archivos en `migrations/`?
- ¿Las columnas documentadas existen en las migraciones SQL?
- ¿Las variables de entorno listadas coinciden con `.dev.vars` (o su estructura esperada)?
- ¿El flujo de R2 documentado sigue siendo el que implementa `app/routes/images.$.tsx`?

### Docs/test.md
- ¿Cada suite listada tiene su archivo `.test.ts(x)` correspondiente en `app/**/__tests__/`?
- ¿Hay archivos de test que no estén registrados en `Docs/test.md`?
- ¿El conteo de tests por suite es aproximadamente correcto?

### Docs/security.md
- ¿Los mecanismos de seguridad documentados siguen presentes en el código?
- ¿Hay nuevas rutas o actions que no aparecen en el análisis de seguridad?

---

## Paso 3 — Reportar diferencias en el chat

Por cada diferencia encontrada, explicar:

1. **Qué dice el documento:** cita textual o descripción del contenido documentado
2. **Qué dice el código:** lo que se observa realmente
3. **Impacto:** si es solo documentación desactualizada o si implica un problema real

Formato sugerido por diferencia:

```
[ARCHIVO_DOC] Sección: X
- Doc dice: "..."
- Código dice: "..."
- Acción sugerida: actualizar doc / actualizar código / investigar más
```

---

## Paso 4 — Esperar decisión del usuario

No editar ningún documento ni código hasta que el usuario indique cómo resolver cada diferencia. Este workflow es de análisis y reporte, no de corrección automática.
