import { useNavigate, useSearchParams } from "@remix-run/react";
import { useRef } from "react";
import { countries } from "~/lib/countries";

const CONDITIONS = ["MS", "AU", "XF", "VF", "F", "VG", "G", "P"];

interface Props {
  filters: { q: string; country: string; year: string; condition: string };
}

const INPUT =
  "rounded-lg border border-[rgba(210,180,130,0.2)] bg-[rgba(14,11,10,0.6)] px-3 py-2 text-sm text-[#F2ECE0] placeholder-[rgba(242,236,224,0.25)] focus:outline-none focus:border-[rgba(210,180,130,0.5)] transition-colors";

export function CoinFilters({ filters }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    navigate(`?${params.toString()}`, { replace: true });
  };

  const handleTextChange = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParam("q", value), 300);
  };

  return (
    <div className="flex flex-wrap gap-3">
      <input
        type="text"
        placeholder="Buscar pieza..."
        defaultValue={filters.q}
        onChange={(e) => handleTextChange(e.target.value)}
        className={`${INPUT} w-48`}
      />

      <select
        defaultValue={filters.country}
        onChange={(e) => updateParam("country", e.target.value)}
        className={`${INPUT} w-44`}
      >
        <option value="">Todos los países</option>
        {countries.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      <input
        type="number"
        placeholder="Año"
        defaultValue={filters.year}
        min={1}
        max={2100}
        onChange={(e) => updateParam("year", e.target.value)}
        className={`${INPUT} w-24`}
      />

      <select
        defaultValue={filters.condition}
        onChange={(e) => updateParam("condition", e.target.value)}
        className={`${INPUT} w-36`}
      >
        <option value="">Todos los estados</option>
        {CONDITIONS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}
