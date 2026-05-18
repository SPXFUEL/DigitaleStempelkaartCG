import type { DashboardKpis } from "@/lib/dashboard";

function Kpi({
  label,
  value,
  hint,
  emoji,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  emoji: string;
  accent?: string;
}) {
  return (
    <div className="cg-card p-4">
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-xl">
          {emoji}
        </span>
        <span
          className="text-[11px] uppercase tracking-wider font-semibold"
          style={{ color: "var(--cg-ink-soft)" }}
        >
          {label}
        </span>
      </div>
      <div
        className="mt-1.5 text-2xl font-bold leading-none"
        style={{ color: accent ?? "var(--cg-coffee-dark)" }}
      >
        {value}
      </div>
      {hint && (
        <div
          className="mt-1 text-[11px]"
          style={{ color: "var(--cg-ink-soft)" }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

export default function KpiGrid({ kpis }: { kpis: DashboardKpis }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <Kpi
        emoji="👥"
        label="Klanten"
        value={String(kpis.totalCustomers)}
        hint={
          kpis.newCustomersLast7Days > 0
            ? `+${kpis.newCustomersLast7Days} deze week`
            : "Geen nieuwe deze week"
        }
      />
      <Kpi
        emoji="☕"
        label="Vandaag"
        value={String(kpis.drinksToday)}
        hint={kpis.drinksToday === 1 ? "drankje" : "drankjes"}
      />
      <Kpi
        emoji="📈"
        label="7 dagen"
        value={String(kpis.drinksLast7Days)}
        hint="drankjes deze week"
      />
      <Kpi
        emoji="🎁"
        label="Gratis (30d)"
        value={String(kpis.rewardsLast30Days + kpis.birthdaysGivenLast30Days)}
        hint={`≈ €${kpis.revenueGivenAwayLast30Days} weggegeven`}
        accent="var(--cg-leaf-dark)"
      />
    </div>
  );
}
