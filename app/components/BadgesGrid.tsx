interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: number;
}

export function BadgesGrid({ badges }: { badges: BadgeItem[] }) {
  if (badges.length === 0) return null;
  return (
    <div className="w-full max-w-3xl mb-8">
      <p className="text-[10px] uppercase tracking-widest text-[rgba(242,236,224,0.4)] mb-3">
        Logros desbloqueados
      </p>
      <div className="flex flex-wrap gap-2">
        {badges.map((b) => (
          <div
            key={b.id}
            title={b.description}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(210,180,130,0.3)] bg-[rgba(201,164,106,0.08)] text-xs text-[#F2ECE0]"
          >
            <span>{b.icon}</span>
            <span>{b.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
