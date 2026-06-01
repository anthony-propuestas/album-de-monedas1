import { useState } from "react";
import type { Coin } from "~/components/CoinCard";

const CONDITION_LABELS: Record<string, string> = {
  MS: "MS — Mint State",
  AU: "AU — Almost Uncirculated",
  XF: "XF — Extremely Fine",
  VF: "VF — Very Fine",
  F: "F — Fine",
  VG: "VG — Very Good",
  G: "G — Good",
  P: "P — Poor",
};

const PHOTO_LABELS: Array<{ key: keyof Coin; label: string }> = [
  { key: "photo_obverse", label: "Anverso" },
  { key: "photo_reverse", label: "Reverso" },
  { key: "photo_edge", label: "Canto" },
  { key: "photo_detail", label: "Detalle" },
];

export function CoinDetailModal({
  coin,
  onClose,
}: {
  coin: Coin | null;
  onClose: () => void;
}) {
  const [activePhoto, setActivePhoto] = useState(0);

  if (!coin) return null;

  const photos = PHOTO_LABELS.filter((p) => coin[p.key]);

  const activeIndex = Math.min(activePhoto, photos.length - 1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[rgba(210,180,130,0.2)] bg-[#120e0a] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-[rgba(210,180,130,0.1)]">
          <div>
            <h2 className="text-lg font-semibold text-[#F2EAD8]">{coin.name}</h2>
            {(coin.country || coin.year) && (
              <p className="text-sm text-[rgba(201,164,106,0.7)] mt-0.5">
                {[coin.country, coin.year].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-[rgba(242,236,224,0.4)] hover:text-[rgba(242,236,224,0.9)] transition-colors"
            aria-label="Cerrar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Galería de imágenes */}
        {photos.length > 0 ? (
          <div className="p-5 border-b border-[rgba(210,180,130,0.1)]">
            <div className="aspect-square w-full max-w-xs mx-auto rounded-xl overflow-hidden bg-[rgba(14,11,10,0.6)] border border-[rgba(210,180,130,0.15)]">
              <img
                src={`/images/${coin[photos[activeIndex].key] as string}`}
                alt={photos[activeIndex].label}
                className="w-full h-full object-cover"
              />
            </div>

            {photos.length > 1 && (
              <div className="flex gap-2 justify-center mt-3">
                {photos.map((p, i) => (
                  <button
                    key={p.key}
                    onClick={() => setActivePhoto(i)}
                    className={`flex flex-col items-center gap-1 group`}
                  >
                    <div
                      className={`w-14 h-14 rounded-lg overflow-hidden border transition-colors ${
                        i === activeIndex
                          ? "border-[#C9A46A]"
                          : "border-[rgba(210,180,130,0.2)] hover:border-[rgba(210,180,130,0.4)]"
                      }`}
                    >
                      <img
                        src={`/images/${coin[p.key] as string}`}
                        alt={p.label}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span
                      className={`text-[10px] transition-colors ${
                        i === activeIndex
                          ? "text-[#C9A46A]"
                          : "text-[rgba(242,236,224,0.4)]"
                      }`}
                    >
                      {p.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-12 text-[rgba(201,164,106,0.3)]">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <circle cx="12" cy="12" r="8" />
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
            </svg>
          </div>
        )}

        {/* Datos */}
        <div className="p-5 border-b border-[rgba(210,180,130,0.1)]">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {coin.denomination && (
              <DataRow label="Denominación" value={coin.denomination} />
            )}
            {coin.condition && (
              <DataRow
                label="Condición"
                value={CONDITION_LABELS[coin.condition] ?? coin.condition}
              />
            )}
            {coin.mint && <DataRow label="Casa de acuñación" value={coin.mint} />}
            {coin.catalog_ref && (
              <DataRow label="Ref. catálogo" value={coin.catalog_ref} />
            )}
            {coin.estimated_value != null && (
              <DataRow
                label="Valor estimado"
                value={`$${coin.estimated_value.toFixed(2)} USD`}
              />
            )}
          </div>
        </div>

        {/* Historia */}
        {coin.notes && (
          <div className="p-5">
            <p className="text-xs font-medium text-[rgba(201,164,106,0.6)] uppercase tracking-wider mb-2">
              Historia de cómo se consiguió
            </p>
            <p className="text-sm text-[rgba(242,236,224,0.75)] leading-relaxed whitespace-pre-wrap">
              {coin.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-[rgba(201,164,106,0.5)] uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="text-sm text-[rgba(242,236,224,0.85)]">{value}</p>
    </div>
  );
}
