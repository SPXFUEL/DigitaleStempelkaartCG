import type { DayBucket } from "@/lib/dashboard";

const DAY_LABELS = ["Z", "M", "D", "W", "D", "V", "Z"]; // zondag t/m zaterdag

function dayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  return DAY_LABELS[d.getUTCDay()];
}

export default function ActivityChart({ buckets }: { buckets: DayBucket[] }) {
  const totals = buckets.map((b) => b.stamps + b.rewards + b.birthdays);
  const max = Math.max(1, ...totals);
  const totalAll = totals.reduce((a, n) => a + n, 0);

  return (
    <section className="cg-card p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h2
          className="text-base font-semibold"
          style={{ color: "var(--cg-coffee-dark)" }}
        >
          Drukte laatste {buckets.length} dagen
        </h2>
        <span
          className="text-xs"
          style={{ color: "var(--cg-ink-soft)" }}
        >
          {totalAll} totaal
        </span>
      </div>
      <div className="flex items-end gap-1 h-32">
        {buckets.map((b, i) => {
          const total = b.stamps + b.rewards + b.birthdays;
          const heightPct = (total / max) * 100;
          const isToday = i === buckets.length - 1;
          return (
            <div key={b.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-md transition-all"
                style={{
                  height: `${Math.max(4, heightPct)}%`,
                  background: isToday
                    ? "var(--cg-coffee-dark)"
                    : "var(--cg-coffee)",
                  opacity: total === 0 ? 0.18 : 1,
                  minHeight: 2,
                }}
                title={`${b.date}: ${total} drankjes (${b.stamps} stempel, ${b.rewards} reward, ${b.birthdays} bday)`}
                aria-label={`${b.date}: ${total} drankjes`}
              />
              <span
                className="text-[10px]"
                style={{
                  color: isToday ? "var(--cg-coffee-dark)" : "var(--cg-ink-soft)",
                  fontWeight: isToday ? 600 : 400,
                }}
              >
                {dayLabel(b.date)}
              </span>
            </div>
          );
        })}
      </div>
      <div
        className="mt-2 text-[11px] flex justify-between"
        style={{ color: "var(--cg-ink-soft)" }}
      >
        <span>{buckets[0]?.date.slice(5).replace("-", "/")}</span>
        <span>vandaag</span>
      </div>
    </section>
  );
}
