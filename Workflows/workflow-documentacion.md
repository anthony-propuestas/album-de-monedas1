# Workflow: Documentación

Mantiene los documentos de documentación sincronizados con el estado real del código tras cada sesión de cambios.

---

## Documentos de documentación del proyecto

Todos los `.md` excepto `Docs/test.md` y `Docs/security.md` (que tienen sus propios workflows):

- `README.md` — visión general, rutas, stack, cómo correr el proyecto
- `CLAUDE.md` — instrucciones de arquitectura para Claude Code
- `Docs/data.md` — schema D1, flujo R2, sesiones, badges, env vars

---

## Paso 1 — Ver qué cambió

```bash
git diff HEAD~1
```

Leer el diff completo para entender qué se agregó, modificó o eliminó, y por qué.

---

## Paso 2 — Analizar si el cambio requiere documentar

Por cada cambio relevante, preguntarse:

- ¿Cambió el schema de la DB? → `Docs/data.md`
- ¿Se agregó/eliminó una ruta? → `README.md` y `CLAUDE.md`
- ¿Cambió el stack o una dependencia importante? → `README.md` y `CLAUDE.md`
- ¿Cambió la lógica de R2 / sesiones / badges? → `Docs/data.md`
- ¿Se agregó un componente o lib nuevo? → `CLAUDE.md` (sección Arquitectura)
- ¿Es algo completamente nuevo sin doc existente? → crear sección nueva en el doc más cercano, o crear un archivo nuevo en `Docs/`

Cambios que **no** necesitan documentarse aquí: fixes de bugs sin cambio de interfaz, refactors internos, ajustes de estilos.

---

## Paso 3 — Documentar

Editar los documentos relevantes. El foco es explicar **cómo funciona el código**, no qué líneas se tocaron:

- Describe el flujo, no el diff
- Actualiza tablas, diagramas o listas que hayan quedado desactualizadas
- Si una sección ya no aplica, elimínala o márcala como obsoleta

---

## Paso 4 — Resumir en el chat

Al terminar, indicar:
- Qué documentos se actualizaron o crearon
- Qué secciones específicas cambiaron y por qué
