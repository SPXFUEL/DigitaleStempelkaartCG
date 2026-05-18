import type { Customer } from "@/lib/types";

interface RecentRedeem {
  customer: Customer;
  type: "redeem" | "birthday";
  at: string;
}

function relative(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const min = Math.floor((now.getTime() - then.getTime()) / 60000);
  if (min < 1) return "zojuist";
  if (min < 60) return `${min} min geleden`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} uur geleden`;
  const day = Math.floor(hour / 24);
  if (day === 1) return "gisteren";
  return `${day} dagen geleden`;
}

export default function RecentRedeems({ items }: { items: RecentRedeem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="cg-card p-5">
      <h2
        className="text-base font-semibold mb-3"
        style={{ color: "var(--cg-coffee-dark)" }}
      >
        Recente blije klanten
      </h2>
      <ul className="space-y-2">
        {items.map(({ customer, type, at }) => (
          <li key={`${customer.id}-${at}`} className="flex items-center gap-2.5">
            <span aria-hidden className="text-lg">
              {type === "birthday" ? "🎂" : "🎁"}
            </span>
            <div className="flex-1">
              <div
                className="text-sm font-medium"
                style={{ color: "var(--cg-ink)" }}
              >
                {customer.name}
                <span
                  className="font-normal"
                  style={{ color: "var(--cg-ink-soft)" }}
                >
                  {" "}
                  · {type === "birthday" ? "verjaardags-tractatie" : "gratis drankje"}
                </span>
              </div>
              <div
                className="text-[11px]"
                style={{ color: "var(--cg-ink-soft)" }}
              >
                {relative(at)}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
