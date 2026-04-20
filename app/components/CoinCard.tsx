export interface Coin {
  id: string;
  user_id: string;
  name: string;
  country: string | null;
  year: number | null;
  denomination: string | null;
  condition: string | null;
  mint: string | null;
  catalog_ref: string | null;
  estimated_value: number | null;
  notes: string | null;
  photo_obverse: string | null;
  photo_reverse: string | null;
  photo_edge: string | null;
  photo_detail: string | null;
  created_at: number;
}

const CONDITION_COLORS: Record<string, string> = {
  MS: "bg-emerald-900/50 text-emerald-300 border-emerald-700/50",
  AU: "bg-green-900/50 text-green-300 border-green-700/50",
  XF: "bg-blue-900/50 text-blue-300 border-blue-700/50",
  VF: "bg-cyan-900/50 text-cyan-300 border-cyan-700/50",
  F:  "bg-yellow-900/50 text-yellow-300 border-yellow-700/50",
  VG: "bg-orange-900/50 text-orange-300 border-orange-700/50",
  G:  "bg-amber-900/50 text-amber-300 border-amber-700/50",
  P:  "bg-red-900/50 text-red-300 border-red-700/50",
};

export function CoinCard({ coin }: { coin: Coin }) {
  const conditionStyle =
    coin.condition ? (CONDITION_COLORS[coin.condition] ?? "bg-zinc-900/50 text-zinc-300 border-zinc-700/50") : null;

  const meta = [coin.country, coin.year].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col rounded-xl border border-[rgba(210,180,130,0.2)] bg-[rgba(20,17,16,0.85)] overflow-hidden hover:border-[rgba(210,180,130,0.4)] transition-colors cursor-pointer">
      <div className="aspect-square w-full bg-[rgba(14,11,10,0.8)] flex items-center justify-center p-4">
        <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-[rgba(14,11,10,0.9)]">
          {coin.photo_obverse ? (
            <img
              src={`/images/${coin.photo_obverse}`}
              alt={`Anverso de ${coin.name}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-[rgba(201,164,106,0.3)]">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="8" />
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
              </svg>
              <span className="text-xs">Sin foto</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 p-3">
        <p
          className="text-sm font-semibold text-[#F2ECE0] truncate"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {coin.name}
        </p>
        <div className="flex items-center justify-between gap-2">
          {meta && <span className="text-xs text-[rgba(242,236,224,0.5)] truncate">{meta}</span>}
          {conditionStyle && (
            <span
              className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded border ${conditionStyle}`}
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {coin.condition}
            </span>
          )}
        </div>
        {coin.denomination && (
          <p className="text-xs text-[rgba(201,164,106,0.7)]">{coin.denomination}</p>
        )}
      </div>
    </div>
  );
}
