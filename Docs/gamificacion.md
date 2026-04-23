# Gamificación — Plan de implementación

Checklist ordenado por complejidad ascendente. Cada feature es independiente y deployable por separado.

---

## Feature 1 — Stats en el Dashboard Home ✅ Implementado

**Objetivo:** mostrar 3 cifras debajo del saludo en `/home`: total de piezas, valor estimado acumulado y condición dominante.

**Impacto:** inmediato, sin cambio de schema, sin componentes nuevos.

### Archivos a modificar

- `app/routes/home.tsx`

### Cambios en el loader

En `home.tsx`, después de insertar/verificar el usuario, agregar 3 queries en paralelo:

```ts
const [statsRow, valueRow, conditionRow] = await Promise.all([
  db
    .prepare("SELECT COUNT(*) as total FROM coins WHERE user_id = ?")
    .bind(user.id)
    .first<{ total: number }>(),
  db
    .prepare(
      "SELECT COALESCE(SUM(estimated_value), 0) as total FROM coins WHERE user_id = ? AND estimated_value IS NOT NULL"
    )
    .bind(user.id)
    .first<{ total: number }>(),
  db
    .prepare(
      "SELECT condition, COUNT(*) as cnt FROM coins WHERE user_id = ? AND condition IS NOT NULL GROUP BY condition ORDER BY cnt DESC LIMIT 1"
    )
    .bind(user.id)
    .first<{ condition: string; cnt: number }>(),
]);

const stats = {
  total: statsRow?.total ?? 0,
  estimatedValue: valueRow?.total ?? 0,
  topCondition: conditionRow?.condition ?? null,
};
```

Incluir `stats` en el `json({ user, profileCompleted, stats })`.

### Cambios en el componente

Debajo de `<p>Bienvenido, {user.name}</p>` y antes del grid de nav, agregar un bloque de 3 tarjetas:

```tsx
<div className="grid grid-cols-3 gap-3 w-full max-w-3xl mb-10">
  <div className="rounded-xl border border-[rgba(210,180,130,0.2)] bg-[rgba(20,17,16,0.85)] px-4 py-5 text-center">
    <p className="text-2xl font-semibold text-[#C9A46A]">{stats.total}</p>
    <p className="text-[10px] uppercase tracking-widest text-[rgba(242,236,224,0.4)] mt-1">piezas</p>
  </div>
  <div className="rounded-xl border border-[rgba(210,180,130,0.2)] bg-[rgba(20,17,16,0.85)] px-4 py-5 text-center">
    <p className="text-2xl font-semibold text-[#C9A46A]">
      {stats.estimatedValue > 0 ? `$${stats.estimatedValue.toLocaleString("es-AR")}` : "—"}
    </p>
    <p className="text-[10px] uppercase tracking-widest text-[rgba(242,236,224,0.4)] mt-1">valor est.</p>
  </div>
  <div className="rounded-xl border border-[rgba(210,180,130,0.2)] bg-[rgba(20,17,16,0.85)] px-4 py-5 text-center">
    <p className="text-2xl font-semibold text-[#C9A46A]">{stats.topCondition ?? "—"}</p>
    <p className="text-[10px] uppercase tracking-widest text-[rgba(242,236,224,0.4)] mt-1">condición top</p>
  </div>
</div>
```

### Checklist

- [x] Agregar las 3 queries en paralelo en el loader de `home.tsx`
- [x] Tipear `stats` en el return del loader
- [x] Renderizar el bloque de 3 tarjetas en el componente
- [x] Verificar que `stats.total === 0` muestre "0" y no revienta con usuario sin monedas
- [x] `npm run typecheck` sin errores

---

## Feature 2 — Progreso por Serie en Mi Colección

**Objetivo:** mostrar barras de progreso por cada serie del catálogo (actualmente solo Argentina) en `/mycollection`. Por ejemplo: "Serie 1 — 8 / 63 monedas".

**Impacto:** reutiliza 100% los datos de `argentina.ts` y la DB existente. Sin schema nuevo.

### Archivos a modificar

- `app/routes/mycollection.tsx`

### Lógica en el loader

⚠️ **Importante**: el array `coins` ya tiene filtros aplicados (búsqueda, país, año, condición). Para que el progreso sea siempre correcto, hacer una query separada sin filtros:

```ts
import { COINS_BY_COUNTRY } from "~/lib/coins";

// Query sin filtros — independiente de los filtros activos del usuario
const { results: allCoins } = await db
  .prepare("SELECT name, country FROM coins WHERE user_id = ?")
  .bind(user.id)
  .all<{ name: string; country: string | null }>();

// Nombres que el usuario tiene para Argentina
const argCoins = allCoins.filter((c) => c.country === "AR");
const ownedNames = new Set(argCoins.map((c) => c.name));

// Catálogo agrupado por serie
const catalog = COINS_BY_COUNTRY["AR"] ?? [];
const seriesMap = new Map<string, { total: number; owned: number }>();

for (const entry of catalog) {
  const key = entry.serie ?? "Sin serie";
  const current = seriesMap.get(key) ?? { total: 0, owned: 0 };
  current.total += 1;
  if (ownedNames.has(entry.nombre)) current.owned += 1;
  seriesMap.set(key, current);
}

const seriesProgress = Array.from(seriesMap.entries()).map(([serie, data]) => ({
  serie,
  ...data,
  pct: Math.round((data.owned / data.total) * 100),
}));
```

Incluir `seriesProgress` en el `json(...)`. **No** pasar `allCoins` al cliente — solo `seriesProgress`.

### Componente nuevo

Crear `app/components/SeriesProgress.tsx`:

```tsx
interface SeriesStat {
  serie: string;
  total: number;
  owned: number;
  pct: number;
}

export function SeriesProgress({ series }: { series: SeriesStat[] }) {
  return (
    <div className="mb-8 flex flex-col gap-3">
      <h2 className="text-xs uppercase tracking-widest text-[rgba(242,236,224,0.4)]">
        Progreso por serie — Argentina
      </h2>
      {series.map((s) => (
        <div key={s.serie}>
          <div className="flex justify-between text-xs text-[rgba(242,236,224,0.6)] mb-1">
            <span>{s.serie}</span>
            <span>{s.owned} / {s.total}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[rgba(210,180,130,0.12)]">
            <div
              className="h-full rounded-full bg-[#C9A46A] transition-all"
              style={{ width: `${s.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
```

En `mycollection.tsx`, importar y renderizar `<SeriesProgress series={seriesProgress} />` entre el header y los filtros.

### Checklist

- [ ] Agregar lógica de cálculo de series en el loader de `mycollection.tsx`
- [ ] Tipear `seriesProgress` en el return del loader
- [ ] Crear `app/components/SeriesProgress.tsx`
- [ ] Importar y usar `<SeriesProgress>` en `mycollection.tsx`
- [ ] Verificar que funciona con 0 monedas (barras en 0%, no crash)
- [ ] `npm run typecheck` sin errores

---

## Feature 3 — Moneda del Día

**Objetivo:** en `/home`, mostrar una tarjeta "Moneda del día" con una moneda del catálogo que el usuario **no tiene**, rotando diariamente de forma determinística (misma moneda para todos en el mismo día).

**Impacto:** zero infraestructura extra. Solo catálogo + 1 query de nombres en el loader.

### Archivos a modificar

- `app/routes/home.tsx`

### Lógica en el loader

```ts
import { COINS_BY_COUNTRY } from "~/lib/coins";

// Nombres que el usuario ya tiene
const { results: ownedRows } = await db
  .prepare("SELECT name FROM coins WHERE user_id = ?")
  .bind(user.id)
  .all<{ name: string }>();
const ownedSet = new Set(ownedRows.map((r) => r.name));

// Monedas del catálogo que no tiene
const catalog = COINS_BY_COUNTRY["AR"] ?? [];
const missing = catalog.filter((c) => !ownedSet.has(c.nombre));

// Índice determinístico por día del año
const dayOfYear = Math.floor(
  (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000
);
const coinOfDay = missing.length > 0 ? missing[dayOfYear % missing.length] : null;
```

Incluir `coinOfDay` en el `json(...)`.

### Cambios en el componente

Agregar debajo del bloque de stats (Feature 1), antes del grid de nav:

```tsx
{coinOfDay && (
  <div className="w-full max-w-3xl mb-8 rounded-xl border border-[rgba(210,180,130,0.25)] bg-[rgba(20,17,16,0.85)] px-5 py-4 flex items-center justify-between gap-4">
    <div>
      <p className="text-[10px] uppercase tracking-widest text-[rgba(242,236,224,0.4)] mb-1">
        Moneda del día
      </p>
      <p className="text-sm font-medium text-[#F2ECE0]">{coinOfDay.nombre}</p>
      <p className="text-xs text-[rgba(242,236,224,0.5)] mt-0.5">
        {coinOfDay.denominacion} · {coinOfDay.anio} · {coinOfDay.serie ?? "Sin serie"}
      </p>
    </div>
    <a
      href="/mycollection"
      className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-[rgba(210,180,130,0.3)] text-[#C9A46A] hover:bg-[rgba(201,164,106,0.12)] transition-colors"
    >
      ¿La tenés?
    </a>
  </div>
)}
```

Si el usuario tiene todas las monedas del catálogo, `coinOfDay` es `null` y el bloque no renderiza.

### Checklist

- [ ] Agregar query de nombres en el loader de `home.tsx`
- [ ] Calcular `missing` y `coinOfDay` en el loader
- [ ] Tipear `coinOfDay: CoinEntry | null` en el return
- [ ] Importar `CoinEntry` desde `~/lib/coins` en `home.tsx`
- [ ] Renderizar el bloque en el componente
- [ ] Verificar caso borde: usuario con todas las monedas (no debe romper)
- [ ] `npm run typecheck` sin errores

---

## Feature 4 — Badges / Logros

**Objetivo:** sistema de logros desbloqueables. Los badges se calculan en cada visita y se persisten en D1 para mostrar la fecha de desbloqueo.

**Requiere:** nueva migración SQL.

### Schema nuevo

Crear `migrations/0003_create_user_badges.sql`:

```sql
CREATE TABLE IF NOT EXISTS user_badges (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  unlocked_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_badges_user ON user_badges(user_id);
```

### Catálogo de badges

Crear `app/lib/badges.ts`:

```ts
export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const BADGES: BadgeDef[] = [
  { id: "first_piece",       name: "Primera pieza",        description: "Agregaste tu primera moneda",                    icon: "🪙" },
  { id: "decade_collector",  name: "Coleccionista de épocas", description: "Tenés monedas de 3 o más años distintos",     icon: "📅" },
  { id: "arborist",          name: "Arborista",             description: "Tenés al menos una moneda de la serie Árboles", icon: "🌳" },
  { id: "historian",         name: "Historiador",           description: "Tenés al menos una moneda conmemorativa",       icon: "🏛️" },
  { id: "top_condition",     name: "Impecable",             description: "Tenés al menos una moneda en estado MS o AU",   icon: "💎" },
  { id: "complete_series",   name: "Serie completa",        description: "Completaste una serie entera del catálogo",     icon: "⭐" },
];

export const BADGE_MAP = Object.fromEntries(BADGES.map((b) => [b.id, b]));
```

### Función de cálculo

Agregar en `app/lib/badges.ts`:

```ts
import { COINS_BY_COUNTRY } from "~/lib/coins";

// Tipo local — evita importar desde un componente React en un archivo de servidor
interface CoinForBadges {
  name: string;
  country: string | null;
  year: number | null;
  condition: string | null;
}

export function computeEarnedBadgeIds(coins: CoinForBadges[]): string[] {
  const earned: string[] = [];
  const argCoins = coins.filter((c) => c.country === "AR");
  const ownedNames = new Set(coins.map((c) => c.name));

  if (coins.length >= 1) earned.push("first_piece");

  const uniqueYears = new Set(coins.map((c) => c.year).filter(Boolean));
  if (uniqueYears.size >= 3) earned.push("decade_collector");

  const catalog = COINS_BY_COUNTRY["AR"] ?? [];
  const hasArborist = argCoins.some((c) =>
    catalog.find((e) => e.nombre === c.name && e.serie === "Árboles de la República Argentina")
  );
  if (hasArborist) earned.push("arborist");

  const hasHistorian = argCoins.some((c) =>
    catalog.find((e) => e.nombre === c.name && e.serie === "Conmemorativa")
  );
  if (hasHistorian) earned.push("historian");

  if (coins.some((c) => c.condition === "MS" || c.condition === "AU"))
    earned.push("top_condition");

  // Serie completa: alguna serie donde owned === total
  const seriesMap = new Map<string, { total: number; owned: number }>();
  for (const entry of catalog) {
    const key = entry.serie ?? "Sin serie";
    const cur = seriesMap.get(key) ?? { total: 0, owned: 0 };
    cur.total += 1;
    if (ownedNames.has(entry.nombre)) cur.owned += 1;
    seriesMap.set(key, cur);
  }
  const hasComplete = [...seriesMap.values()].some((s) => s.owned === s.total && s.total > 0);
  if (hasComplete) earned.push("complete_series");

  return earned;
}
```

### Lógica en el loader de home.tsx

```ts
import { computeEarnedBadgeIds, BADGE_MAP } from "~/lib/badges";

// Cargar monedas del usuario (para calcular badges)
const { results: allCoins } = await db
  .prepare("SELECT * FROM coins WHERE user_id = ?")
  .bind(user.id)
  .all<Coin>();

// Calcular badges ganados
const earnedIds = computeEarnedBadgeIds(allCoins);

// Persistir los nuevos (INSERT OR IGNORE)
if (earnedIds.length > 0) {
  await Promise.all(
    earnedIds.map((id) =>
      db
        .prepare(
          "INSERT OR IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)"
        )
        .bind(user.id, id)
        .run()
    )
  );
}

// Leer badges persistidos (con fecha de desbloqueo)
const { results: badgeRows } = await db
  .prepare("SELECT badge_id, unlocked_at FROM user_badges WHERE user_id = ?")
  .bind(user.id)
  .all<{ badge_id: string; unlocked_at: number }>();

const badges = badgeRows.map((row) => ({
  ...BADGE_MAP[row.badge_id],
  unlockedAt: row.unlocked_at,
}));
```

### Componente nuevo

Crear `app/components/BadgesGrid.tsx`:

```tsx
interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: number;
}

export function BadgesGrid({ badges }: { badges: BadgeItem[] }) {
  if (badges.length === 0) return null;
  return (
    <div className="w-full max-w-3xl mb-8">
      <p className="text-[10px] uppercase tracking-widest text-[rgba(242,236,224,0.4)] mb-3">
        Logros desbloqueados
      </p>
      <div className="flex flex-wrap gap-2">
        {badges.map((b) => (
          <div
            key={b.id}
            title={b.description}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(210,180,130,0.3)] bg-[rgba(201,164,106,0.08)] text-xs text-[#F2ECE0]"
          >
            <span>{b.icon}</span>
            <span>{b.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Checklist

- [ ] Crear `migrations/0003_create_user_badges.sql`
- [ ] Aplicar migración: `wrangler d1 migrations apply <DB_NAME> --local` (y en prod cuando corresponda)
- [ ] Crear `app/lib/badges.ts` con `BADGES`, `BADGE_MAP` y `computeEarnedBadgeIds`
- [ ] Usar el tipo local `CoinForBadges` en `badges.ts` (no importar desde `~/components/CoinCard` — rompe SSR si el componente alguna vez usa browser APIs)
- [ ] Modificar loader de `home.tsx`: cargar monedas, calcular badges, persistir nuevos, leer con fecha
- [ ] Crear `app/components/BadgesGrid.tsx`
- [ ] Importar y renderizar `<BadgesGrid badges={badges} />` en `home.tsx`
- [ ] Verificar que `INSERT OR IGNORE` no rompe cuando el badge ya existe
- [ ] `npm run typecheck` sin errores
- [ ] Agregar índice `idx_badges_user` en la migración (ya incluido arriba)

---

## Feature 5 — Timeline de Años

**Objetivo:** en `/mycollection`, mostrar una fila de puntos para los años 2000–2024. Punto dorado = el usuario tiene al menos una moneda de ese año. Punto vacío = no tiene. Hover muestra qué monedas son.

**Impacto:** 100% cliente, sin queries extra. Usa el array `coins` que ya viene en el loader.

### Archivos a crear

- `app/components/YearTimeline.tsx`

### Archivos a modificar

- `app/routes/mycollection.tsx` (solo para importar y usar el componente)

### Componente

⚠️ Pasar `allCoins` (sin filtros) al componente, no `coins`. Ver la query `allCoins` introducida en Feature 2 — si ya implementaste Feature 2, reutilizá ese mismo resultado. Si implementás Feature 5 sin Feature 2, agregar la misma query en el loader.

```tsx
const YEAR_RANGE = Array.from({ length: 25 }, (_, i) => 2000 + i);

interface CoinForTimeline { name: string; year: number | null; }

export function YearTimeline({ coins }: { coins: CoinForTimeline[] }) {
  const byYear = new Map<number, Coin[]>();
  for (const coin of coins) {
    if (!coin.year) continue;
    const list = byYear.get(coin.year) ?? [];
    list.push(coin);
    byYear.set(coin.year, list);
  }

  const covered = YEAR_RANGE.filter((y) => byYear.has(y)).length;

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <p className="text-[10px] uppercase tracking-widest text-[rgba(242,236,224,0.4)]">
          Años cubiertos
        </p>
        <p className="text-[10px] text-[rgba(242,236,224,0.4)]">
          {covered} / {YEAR_RANGE.length}
        </p>
      </div>
      <div className="flex gap-1 flex-wrap">
        {YEAR_RANGE.map((year) => {
          const coinsForYear = byYear.get(year);
          const hasCoin = Boolean(coinsForYear);
          return (
            <div
              key={year}
              title={
                coinsForYear
                  ? `${year}: ${coinsForYear.map((c) => c.name).join(", ")}`
                  : `${year}: sin monedas`
              }
              className={`w-7 h-7 rounded-full border text-[9px] flex items-center justify-center transition-colors cursor-default ${
                hasCoin
                  ? "border-[rgba(210,180,130,0.6)] bg-[rgba(201,164,106,0.2)] text-[#C9A46A]"
                  : "border-[rgba(210,180,130,0.15)] text-[rgba(242,236,224,0.2)]"
              }`}
            >
              {String(year).slice(2)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

En `mycollection.tsx`, importar y colocar `<YearTimeline coins={allCoins} />` entre `<SeriesProgress>` y `<CoinFilters>`. Incluir `allCoins` en el `json(...)` del loader (solo campos `name` y `year` para no inflar el payload).

### Checklist

- [ ] Crear `app/components/YearTimeline.tsx`
- [ ] Agregar query `allCoins` sin filtros en el loader (o reutilizar la de Feature 2)
- [ ] Importar y usar `<YearTimeline coins={allCoins} />` en `mycollection.tsx`
- [ ] Verificar que monedas sin año (`year: null`) no rompen el componente
- [ ] Verificar que funciona con colección vacía
- [ ] Ajustar el rango `YEAR_RANGE` si el catálogo crece a otros periodos
- [ ] `npm run typecheck` sin errores

---

## Orden de deploy recomendado

| # | Feature | Schema change | Tiempo estimado |
|---|---------|--------------|----------------|
| 1 | Stats en Home | No | ~~1h~~ ✅ |
| 2 | Progreso por Serie | No | ~2h |
| 3 | Moneda del Día | No | ~1h |
| 4 | Badges | Sí (migración 0003) | ~3h |
| 5 | Timeline de Años | No | ~1h |

Features 1, 2, 3 y 5 son completamente seguros de deployar en cualquier orden sin tocar la DB.
Feature 4 requiere correr la migración **antes** del deploy del código que la usa.

---

## Notas de implementación

- El cruce nombre↔catálogo (`coins.name === CoinEntry.nombre`) asume que el nombre en DB se guardó exactamente igual al `nombre` del catálogo. Esto ya está garantizado por la validación en el `action` de `mycollection.tsx` (línea ~128).
- `computeEarnedBadgeIds` se puede mover a un Worker o llamar solo cuando cambia `coins.length` para evitar recalcular en cada visita. Por ahora el cálculo es O(n) y suficientemente rápido.
- Cuando se agreguen nuevos países al catálogo (`COINS_BY_COUNTRY`), el progreso por serie y los badges deberían extenderse para cubrir esos países también.
