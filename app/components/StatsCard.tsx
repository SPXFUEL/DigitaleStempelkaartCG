import type { CustomerStats } from "@/lib/stats";

function formatRelative(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - then.getTime();
  const day = 1000 * 60 * 60 * 24;
  const days = Math.floor(diffMs / day);
  if (days === 0) return "vandaag";
  if (days === 1) return "gisteren";
  if (days < 7) return `${days} dagen geleden`;
  if (days < 30) return `${Math.floor(days / 7)} weken geleden`;
  if (days < 365) return `${Math.floor(days / 30)} maanden geleden`;
  return `${Math.floor(days / 365)} jaar geleden`;
}

export default function StatsCard({ stats }: { stats: CustomerStats }) {
  // Verzamel zinvolle stats (laat lege/triviale weg)
  const items: { label: string; value: string; emoji: string }[] = [];

  if (stats.totalDrinks > 0) {
    items.push({
      emoji: "☕",
      label: "Drankjes totaal",
      value: String(stats.totalDrinks),
    });
  }
  if (stats.totalRewards > 0) {
    items.push({
      emoji: "🎁",
      label: "Gratis ingewisseld",
      value: String(stats.totalRewards),
    });
    items.push({
      emoji: "💶",
      label: "Bespaard",
      value: `€${stats.savedEur}`,
    });
  }
  if (stats.weekStreak >= 2) {
    items.push({
      emoji: "🔥",
      label: stats.weekStreak === 1 ? "Week op rij" : "Weken op rij",
      value: String(stats.weekStreak),
    });
  }
  if (stats.favoriteDay) {
    items.push({
      emoji: "📅",
      label: "Favoriete dag",
      value: stats.favoriteDay,
    });
  }
  if (stats.daysAsMember >= 7) {
    items.push({
      emoji: "🌱",
      label: "Lid sinds",
      value:
        stats.daysAsMember < 30
          ? `${stats.daysAsMember} dagen`
          : `${Math.floor(stats.daysAsMember / 30)} mnd`,
    });
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="cg-card p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h2
          className="text-base font-semibold"
          style={{ color: "var(--cg-coffee-dark)" }}
        >
          Jouw stats
        </h2>
        {stats.lastVisitAt && (
          <span
            className="text-xs"
            style={{ color: "var(--cg-ink-soft)" }}
          >
            Laatst: {formatRelative(stats.lastVisitAt)}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {items.map((it) => (
          <div
            key={it.label}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
            style={{ background: "var(--cg-cream)" }}
          >
            <span aria-hidden className="text-xl">
              {it.emoji}
            </span>
            <div className="flex flex-col leading-tight">
              <span
                className="text-base font-bold"
                style={{ color: "var(--cg-coffee-dark)" }}
              >
                {it.value}
              </span>
              <span
                className="text-[11px]"
                style={{ color: "var(--cg-ink-soft)" }}
              >
                {it.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
