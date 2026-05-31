import { COINS_BY_COUNTRY } from "~/lib/coins";

export interface BadgeDef {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const BADGES: BadgeDef[] = [
  { id: "first_piece",      name: "Primera pieza",          description: "Agregaste tu primera moneda",                    icon: "🪙" },
  { id: "decade_collector", name: "Coleccionista de épocas", description: "Tenés monedas de 3 o más años distintos",       icon: "📅" },
  { id: "arborist",         name: "Arborista",               description: "Tenés al menos una moneda de la serie Árboles", icon: "🌳" },
  { id: "historian",        name: "Historiador",             description: "Tenés al menos una moneda conmemorativa",       icon: "🏛️" },
  { id: "top_condition",    name: "Impecable",               description: "Tenés al menos una moneda en estado MS o AU",   icon: "💎" },
  { id: "complete_series",  name: "Serie completa",          description: "Completaste una serie entera del catálogo",     icon: "⭐" },
];

export const BADGE_MAP = Object.fromEntries(BADGES.map((b) => [b.id, b]));

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
