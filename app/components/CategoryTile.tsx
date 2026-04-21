import { Link } from "@remix-run/react";

interface Props {
  slug: string;
  title: string;
  description: string;
  iconKey: string;
  topName: string | null;
  topPicture: string | null;
  topStat: string | null;
}

function TileIcon({ name }: { name: string }) {
  const cls = "w-6 h-6 text-[#C9A46A]";
  switch (name) {
    case "layers":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      );
    case "clock":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case "trending-up":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      );
    case "globe":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    case "star":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case "zap":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case "grid":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      );
    case "award":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="6" />
          <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
        </svg>
      );
    default:
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
}

export function CategoryTile({ slug, title, description, iconKey, topName, topPicture, topStat }: Props) {
  return (
    <Link
      to={`/collections/${slug}`}
      className="group flex flex-col gap-4 p-5 rounded-2xl border border-[rgba(210,180,130,0.2)] bg-[rgba(20,17,16,0.85)] backdrop-blur-md hover:border-[rgba(210,180,130,0.45)] hover:bg-[rgba(201,164,106,0.08)] transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="p-2.5 rounded-xl bg-[rgba(201,164,106,0.1)] border border-[rgba(210,180,130,0.15)]">
          <TileIcon name={iconKey} />
        </div>
        <svg
          className="w-4 h-4 text-[rgba(201,164,106,0.35)] group-hover:text-[#C9A46A] transition-colors mt-1"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </div>

      <div>
        <h3
          className="text-sm font-semibold text-[#F2ECE0] leading-snug mb-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h3>
        <p className="text-xs text-[rgba(242,236,224,0.4)] leading-relaxed">
          {description}
        </p>
      </div>

      {topName ? (
        <div className="flex items-center gap-2.5 pt-3 border-t border-[rgba(210,180,130,0.1)]">
          <div className="w-7 h-7 rounded-full overflow-hidden bg-[rgba(201,164,106,0.12)] border border-[rgba(210,180,130,0.2)] flex-shrink-0 flex items-center justify-center text-[#C9A46A] text-xs font-semibold">
            {topPicture ? (
              <img src={topPicture} alt={topName} className="w-full h-full object-cover" />
            ) : (
              topName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[rgba(242,236,224,0.8)] truncate">{topName}</p>
            {topStat && (
              <p className="text-[11px] text-[rgba(201,164,106,0.7)]" style={{ fontFamily: "var(--font-mono)" }}>
                {topStat}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="pt-3 border-t border-[rgba(210,180,130,0.1)]">
          <p className="text-xs text-[rgba(242,236,224,0.25)]">Sin datos aún</p>
        </div>
      )}
    </Link>
  );
}
