export interface Category {
  slug: string;
  title: string;
  description: string;
  iconKey: string;
  sql: string;
  statLabel: (stat: string | number | null) => string;
}

export const CATEGORIES: Category[] = [
  {
    slug: "most-pieces",
    title: "Mayor cantidad de piezas",
    description: "Los coleccionistas con más monedas en su álbum",
    iconKey: "layers",
    sql: `SELECT u.id, u.name, u.picture, CAST(COUNT(c.id) AS INTEGER) AS stat
          FROM users u JOIN coins c ON c.user_id = u.id
          GROUP BY u.id ORDER BY stat DESC LIMIT ?`,
    statLabel: (s) => (s != null ? `${s} piezas` : "—"),
  },
  {
    slug: "oldest",
    title: "Piezas más antiguas",
    description: "Las colecciones con monedas de más historia",
    iconKey: "clock",
    sql: `SELECT u.id, u.name, u.picture, MIN(c.year) AS stat
          FROM users u JOIN coins c ON c.user_id = u.id
          WHERE c.year IS NOT NULL
          GROUP BY u.id ORDER BY stat ASC LIMIT ?`,
    statLabel: (s) => (s != null ? `Desde ${s}` : "—"),
  },
  {
    slug: "highest-value",
    title: "Mayor valor estimado",
    description: "Las colecciones con el mayor valor total acumulado",
    iconKey: "trending-up",
    sql: `SELECT u.id, u.name, u.picture, ROUND(SUM(c.estimated_value), 2) AS stat
          FROM users u JOIN coins c ON c.user_id = u.id
          WHERE c.estimated_value IS NOT NULL
          GROUP BY u.id ORDER BY stat DESC LIMIT ?`,
    statLabel: (s) =>
      s != null ? `$${Number(s).toLocaleString("es-AR")} USD` : "—",
  },
  {
    slug: "most-countries",
    title: "Más países representados",
    description: "Los que más culturas y geografías tienen en su colección",
    iconKey: "globe",
    sql: `SELECT u.id, u.name, u.picture, COUNT(DISTINCT c.country) AS stat
          FROM users u JOIN coins c ON c.user_id = u.id
          WHERE c.country IS NOT NULL
          GROUP BY u.id ORDER BY stat DESC LIMIT ?`,
    statLabel: (s) => (s != null ? `${s} países` : "—"),
  },
  {
    slug: "best-condition",
    title: "Mejores condiciones (MS/AU)",
    description: "Los que mejor conservan sus monedas — mínimo 5 piezas",
    iconKey: "star",
    sql: `SELECT u.id, u.name, u.picture,
            ROUND(
              100.0 * SUM(CASE WHEN c.condition IN ('MS','AU') THEN 1 ELSE 0 END)
              / COUNT(c.id),
              1
            ) AS stat
          FROM users u JOIN coins c ON c.user_id = u.id
          GROUP BY u.id HAVING COUNT(c.id) >= 5 ORDER BY stat DESC LIMIT ?`,
    statLabel: (s) => (s != null ? `${s}% MS/AU` : "—"),
  },
  {
    slug: "most-active",
    title: "Más activos este mes",
    description: "Quienes más piezas incorporaron en los últimos 30 días",
    iconKey: "zap",
    sql: `SELECT u.id, u.name, u.picture, CAST(COUNT(c.id) AS INTEGER) AS stat
          FROM users u JOIN coins c ON c.user_id = u.id
          WHERE c.created_at > (strftime('%s','now') - 2592000)
          GROUP BY u.id ORDER BY stat DESC LIMIT ?`,
    statLabel: (s) => (s != null ? `${s} este mes` : "—"),
  },
  {
    slug: "most-denominations",
    title: "Más denominaciones distintas",
    description: "La mayor variedad de valores y tipos de moneda",
    iconKey: "grid",
    sql: `SELECT u.id, u.name, u.picture, COUNT(DISTINCT c.denomination) AS stat
          FROM users u JOIN coins c ON c.user_id = u.id
          WHERE c.denomination IS NOT NULL
          GROUP BY u.id ORDER BY stat DESC LIMIT ?`,
    statLabel: (s) => (s != null ? `${s} denominaciones` : "—"),
  },
  {
    slug: "veteran",
    title: "Coleccionistas veteranos",
    description: "Los que más años llevan en el mundo numismático",
    iconKey: "award",
    sql: `SELECT id, name, picture, collecting_since AS stat
          FROM users
          WHERE collecting_since IS NOT NULL AND collecting_since != ''
          ORDER BY collecting_since ASC LIMIT ?`,
    statLabel: (s) => (s != null ? `Desde ${s}` : "—"),
  },
];

export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
