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

export function CoinCard({ coin }: { coin: Coin }) {

  return (
    <div className="flex flex-col items-center gap-2 cursor-pointer group">
      <div className="aspect-square w-full rounded-full overflow-hidden border border-[rgba(210,180,130,0.2)] group-hover:border-[rgba(210,180,130,0.5)] transition-colors flex items-center justify-center bg-[rgba(14,11,10,0.6)]">
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

      <p className="text-sm text-amber-300/80">
        ${(coin.estimated_value ?? 0).toFixed(2)}
      </p>
    </div>
  );
}
