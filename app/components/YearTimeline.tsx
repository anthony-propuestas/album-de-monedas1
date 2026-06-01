import { useState } from "react";

const YEAR_RANGE = Array.from({ length: 2024 - 1881 + 1 }, (_, i) => 1881 + i);

interface CoinForTimeline {
  name: string;
  year: number | null;
}

export function YearTimeline({ coins }: { coins: CoinForTimeline[] }) {
  const [isOpen, setIsOpen] = useState(false);

  const byYear = new Map<number, CoinForTimeline[]>();
  for (const coin of coins) {
    if (!coin.year) continue;
    const list = byYear.get(coin.year) ?? [];
    list.push(coin);
    byYear.set(coin.year, list);
  }

  const covered = YEAR_RANGE.filter((y) => byYear.has(y)).length;

  return (
    <div className="mb-6 flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center justify-between w-full text-left group px-3 py-2 rounded-lg border border-[rgba(210,180,130,0.2)] hover:border-[rgba(210,180,130,0.4)] hover:bg-[rgba(201,164,106,0.05)] transition-colors"
      >
        <p className="text-xs uppercase tracking-widest text-[rgba(242,236,224,0.4)]">
          Años cubiertos
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[rgba(242,236,224,0.4)]">
            {covered} / {YEAR_RANGE.length}
          </span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`text-[rgba(242,236,224,0.3)] transition-transform duration-200 ${isOpen ? "rotate-0" : "-rotate-90"}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="flex gap-1 flex-wrap px-1">
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
      )}
    </div>
  );
}
