import { Link } from "@remix-run/react";

interface Props {
  rank: number;
  userId: string;
  name: string;
  picture: string | null;
  stat: string;
  fromCategory?: string;
}

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export function CollectorRow({ rank, userId, name, picture, stat, fromCategory }: Props) {
  const href = fromCategory
    ? `/collection/${userId}?from=${fromCategory}`
    : `/collection/${userId}`;

  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-[rgba(210,180,130,0.1)] last:border-0">
      <span
        className="w-8 text-center flex-shrink-0 text-sm"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {MEDAL[rank] ?? (
          <span className="text-[rgba(242,236,224,0.35)]">#{rank}</span>
        )}
      </span>

      <div className="w-9 h-9 rounded-full overflow-hidden bg-[rgba(201,164,106,0.1)] border border-[rgba(210,180,130,0.2)] flex-shrink-0 flex items-center justify-center text-[#C9A46A] text-sm font-semibold">
        {picture ? (
          <img src={picture} alt={name} className="w-full h-full object-cover" />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </div>

      <Link
        to={href}
        className="flex-1 text-sm font-medium text-[rgba(242,236,224,0.85)] hover:text-[#C9A46A] transition-colors truncate"
      >
        {name}
      </Link>

      <span
        className="text-xs text-[rgba(242,236,224,0.45)] flex-shrink-0"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        {stat}
      </span>
    </div>
  );
}
