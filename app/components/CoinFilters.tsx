import { useNavigate, useSearchParams } from "@remix-run/react";
import { useRef, useState } from "react";
import { countries } from "~/lib/countries";
import { CustomSelect } from "~/components/ui/CustomSelect";

const CONDITIONS = ["MS", "AU", "XF", "VF", "F", "VG", "G", "P"];
const CONDITION_OPTIONS = CONDITIONS.map((c) => ({ value: c, label: c }));

interface Props {
  filters: { q: string; country: string; year: string; condition: string };
}

const INPUT =
  "rounded-lg border border-[rgba(210,180,130,0.2)] bg-[rgba(14,11,10,0.6)] px-3 py-2 text-sm text-[#F2ECE0] placeholder-[rgba(242,236,224,0.25)] focus:outline-none focus:border-[rgba(210,180,130,0.5)] transition-colors";

export function CoinFilters({ filters }: Props) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [country, setCountry] = useState(filters.country);
  const [condition, setCondition] = useState(filters.condition);

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
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <input
        type="text"
        placeholder="Buscar pieza..."
        defaultValue={filters.q}
        onChange={(e) => handleTextChange(e.target.value)}
        className={`${INPUT} w-full sm:w-48`}
      />

      <CustomSelect
        value={country}
        onChange={(v) => { setCountry(v); updateParam("country", v); }}
        options={countries}
        placeholder="Todos los países"
        className="w-full sm:w-44"
      />

      <input
        type="number"
        placeholder="Año"
        defaultValue={filters.year}
        min={1}
        max={2100}
        onChange={(e) => updateParam("year", e.target.value)}
        className={`${INPUT} w-full sm:w-24`}
      />

      <CustomSelect
        value={condition}
        onChange={(v) => { setCondition(v); updateParam("condition", v); }}
        options={CONDITION_OPTIONS}
        placeholder="Todos los estados"
        className="w-full sm:w-36"
      />
    </div>
  );
}
