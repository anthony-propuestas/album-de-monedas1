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
