import { useEffect, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import { NUMERIC_TO_ALPHA2 } from "~/lib/country-numeric-map";
import { countries } from "~/lib/countries";

const COUNTRY_NAME: Record<string, string> = Object.fromEntries(
  countries.map(({ value, label }) => [value, label])
);

function lerpColor(t: number, scheme: "blue" | "amber"): string {
  const c = Math.max(0.15, Math.min(1, t));
  if (scheme === "blue") {
    const r = Math.round(20 + c * (96 - 20));
    const g = Math.round(50 + c * (165 - 50));
    const b = Math.round(80 + c * (250 - 80));
    return `rgb(${r},${g},${b})`;
  }
  const r = Math.round(80 + c * (201 - 80));
  const g = Math.round(45 + c * (164 - 45));
  const b = Math.round(10 + c * (106 - 10));
  return `rgb(${r},${g},${b})`;
}

interface CountryPath {
  d: string;
  iso2: string;
}

interface TooltipState {
  x: number;
  y: number;
  name: string;
  count: number;
}

interface WorldMapProps {
  coinsByCountry: Record<string, number>;
  colorScheme?: "blue" | "amber";
  title?: string;
}

export function WorldMap({ coinsByCountry, colorScheme = "blue", title }: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [countryPaths, setCountryPaths] = useState<CountryPath[]>([]);
  const [dims, setDims] = useState({ w: 800, h: 440 });
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    const w = containerRef.current?.clientWidth || 800;
    const h = Math.round(w * 0.55);
    setDims({ w, h });
    setMounted(true);

    fetch("/world-110m.json")
      .then((r) => r.json())
      .then((raw) => {
        const topo = raw as Topology;
        const proj = geoNaturalEarth1()
          .scale((w / 960) * 153)
          .translate([w / 2, h / 2]);
        const gen = geoPath(proj);
        const geo = feature(
          topo,
          topo.objects["countries"] as GeometryCollection
        ) as GeoJSON.FeatureCollection;

        const paths: CountryPath[] = geo.features
          .map((f) => ({
            d: gen(f) ?? "",
            iso2: NUMERIC_TO_ALPHA2[String(+(f as GeoJSON.Feature & { id?: string | number }).id!)] ?? "",
          }))
          .filter((p) => p.d);

        setCountryPaths(paths);
      });
  }, []);

  const maxCount = Math.max(1, ...Object.values(coinsByCountry));
  const totalPieces = Object.values(coinsByCountry).reduce((a, b) => a + b, 0);
  const totalCountries = Object.keys(coinsByCountry).length;
  const emptyFill = colorScheme === "blue" ? "rgba(30,42,60,0.65)" : "rgba(40,28,10,0.65)";

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl border border-[rgba(210,180,130,0.2)] bg-[rgba(20,17,16,0.85)] overflow-hidden"
    >
      {title && (
        <p className="px-5 pt-4 pb-1 text-[10px] uppercase tracking-widest text-[rgba(242,236,224,0.4)]">
          {title}
        </p>
      )}

      {!mounted || countryPaths.length === 0 ? (
        <div className="h-[240px] sm:h-[360px] animate-pulse bg-[rgba(201,164,106,0.04)]" />
      ) : (
        <div className="relative w-full">
          <svg
            viewBox={`0 0 ${dims.w} ${dims.h}`}
            style={{ width: "100%", height: "auto", display: "block" }}
          >
            {countryPaths.map(({ d, iso2 }, i) => {
              const count = iso2 ? (coinsByCountry[iso2] ?? 0) : 0;
              const fill = count > 0 ? lerpColor(count / maxCount, colorScheme) : emptyFill;
              return (
                <path
                  key={i}
                  d={d}
                  fill={fill}
                  stroke="rgba(210,180,130,0.12)"
                  strokeWidth="0.5"
                  onMouseEnter={(e) => {
                    if (!iso2) return;
                    const svgEl = e.currentTarget.closest("svg") as SVGSVGElement;
                    const rect = svgEl.getBoundingClientRect();
                    setTooltip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      name: COUNTRY_NAME[iso2] ?? iso2,
                      count,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })}
          </svg>

          {tooltip && (
            <div
              className="absolute pointer-events-none z-10 px-3 py-1.5 rounded-lg text-xs text-[#F2ECE0] bg-[rgba(14,11,10,0.95)] border border-[rgba(210,180,130,0.25)] shadow-xl whitespace-nowrap"
              style={{
                left: Math.min(tooltip.x + 12, dims.w - 190),
                top: Math.max(tooltip.y - 40, 4),
              }}
            >
              <span className="font-medium">{tooltip.name}</span>
              {tooltip.count > 0 && (
                <span className="ml-2 text-[#C9A46A]">
                  {tooltip.count} {tooltip.count === 1 ? "pieza" : "piezas"}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {totalPieces > 0 && (
        <p className="px-5 py-3 text-[10px] text-[rgba(242,236,224,0.3)] uppercase tracking-widest text-right">
          {totalPieces} {totalPieces === 1 ? "pieza" : "piezas"} · {totalCountries}{" "}
          {totalCountries === 1 ? "país" : "países"}
        </p>
      )}
    </div>
  );
}
