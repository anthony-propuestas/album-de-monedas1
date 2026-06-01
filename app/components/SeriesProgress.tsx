import { useState } from "react";

interface SeriesStat {
  serie: string;
  total: number;
  owned: number;
  pct: number;
}

const COUNTRY_NAMES: Record<string, string> = {
  AR: "Argentina",
};

export function SeriesProgress({
  seriesProgressByCountry,
}: {
  seriesProgressByCountry: Record<string, SeriesStat[]>;
}) {
  const countries = Object.keys(seriesProgressByCountry);
  const [selectedCountry, setSelectedCountry] = useState(
    countries.includes("AR") ? "AR" : (countries[0] ?? "AR")
  );
  const [isOpen, setIsOpen] = useState(true);

  const series = seriesProgressByCountry[selectedCountry] ?? [];
  const countryName = COUNTRY_NAMES[selectedCountry] ?? selectedCountry;

  return (
    <div className="mb-8 flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center justify-between w-full text-left group"
      >
        <h2 className="text-xs uppercase tracking-widest text-[rgba(242,236,224,0.4)]">
          Progreso por serie — {countryName}
        </h2>
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
      </button>

      {isOpen && (
        <>
          {countries.length > 1 && (
            <div className="flex gap-1.5 flex-wrap">
              {countries.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setSelectedCountry(code)}
                  className={`text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-md border transition-colors ${
                    selectedCountry === code
                      ? "border-[rgba(210,180,130,0.5)] text-[#C9A46A] bg-[rgba(201,164,106,0.1)]"
                      : "border-[rgba(210,180,130,0.15)] text-[rgba(242,236,224,0.35)] hover:text-[rgba(242,236,224,0.6)]"
                  }`}
                >
                  {COUNTRY_NAMES[code] ?? code}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3">
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
        </>
      )}
    </div>
  );
}
