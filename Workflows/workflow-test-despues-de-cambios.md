# Workflow: Tests después de cambios

Mantiene los tests sincronizados con el código tras cada sesión de cambios.

---

## Paso 1 — Identificar archivos cambiados

```bash
git diff --name-only HEAD~1
```

Si hay cambios sin commitear, también:

```bash
git status
```

Filtra solo archivos en `app/` (rutas, componentes, lib). Ignora assets, configs, migrations.

---

## Paso 2 — Mapear archivos a sus tests

Convención del proyecto: cada archivo `app/X/Y.ts(x)` tiene su test en `app/X/__tests__/Y.test.ts(x)`.

Por cada archivo cambiado, determinar:

| Situación | Acción |
|-----------|--------|
| Archivo nuevo, sin test correspondiente | **Crear** test en `app/X/__tests__/Y.test.ts(x)` |
| Archivo modificado, test existente | **Editar** test si cambió la interfaz pública (props, exports, comportamiento) |
| Archivo eliminado | **Eliminar** su test correspondiente |
| Archivo modificado, sin test (util interno) | Evaluar si amerita test; documentar decisión |

---

## Paso 3 — Ejecutar los tests

```bash
npm run test:run
```

Esto corre todos los tests una vez (modo CI, sin watch).

---

## Paso 4 — Actualizar `Docs/test.md`

Leer `Docs/test.md` para ver el listado de suites existentes.

- **Test creado:** agregar fila en la tabla de suites con ruta, descripción y cantidad de tests
- **Test editado:** actualizar el conteo y descripción si cambió
- **Test eliminado:** eliminar la fila correspondiente
- Actualizar el total al final del documento

---

## Paso 5 — Comunicar resultado

### Si algún test falla

Reportar en el chat:
1. Qué test(s) fallaron (nombre de suite y caso específico)
2. El error exacto que lanzó Vitest
3. La causa raíz probable (interfaz cambiada, mock desactualizado, lógica rota)
4. Acción recomendada (qué línea/mock/expectation hay que ajustar)

No marcar el workflow como completo hasta que los tests pasen o el usuario decida posponer la corrección.

### Si todos los tests pasan

Resumir en el chat:
- Archivos de código que cambiaron
- Tests creados / editados / eliminados
- Total de tests después del cambio
- Confirmar que `Docs/test.md` fue actualizado
