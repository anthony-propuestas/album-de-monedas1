const YEAR_RANGE = Array.from({ length: 25 }, (_, i) => 2000 + i);

interface CoinForTimeline {
  name: string;
  year: number | null;
}

export function YearTimeline({ coins }: { coins: CoinForTimeline[] }) {
  const byYear = new Map<number, CoinForTimeline[]>();
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
