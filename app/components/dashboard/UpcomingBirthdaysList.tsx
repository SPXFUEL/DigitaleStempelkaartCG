import type { UpcomingBirthday } from "@/lib/dashboard";

const DUTCH_MONTHS = [
  "jan",
  "feb",
  "mrt",
  "apr",
  "mei",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];

function formatDate(yyyymmdd: string): string {
  const [, mm, dd] = yyyymmdd.split("-");
  return `${parseInt(dd, 10)} ${DUTCH_MONTHS[parseInt(mm, 10) - 1]}`;
}

function relative(daysUntil: number): string {
  if (daysUntil === 0) return "vandaag";
  if (daysUntil === 1) return "morgen";
  return `over ${daysUntil} dagen`;
}

export default function UpcomingBirthdaysList({
  items,
}: {
  items: UpcomingBirthday[];
}) {
  if (items.length === 0) {
    return null; // verberg compleet als er niks aankomt
  }

  return (
    <section
      className="cg-card p-5"
      style={{
        background:
          "linear-gradient(135deg, var(--cg-cream) 0%, #faf2e3 100%)",
      }}
    >
      <h2
        className="text-base font-semibold mb-3 flex items-center gap-2"
        style={{ color: "var(--cg-coffee-dark)" }}
      >
        <span aria-hidden>🎂</span>
        Jarigen deze week
      </h2>
      <ul className="space-y-2">
        {items.map(({ customer, nextDate, daysUntil }) => (
          <li
            key={customer.id}
            className="flex items-center justify-between"
          >
            <div>
              <div
                className="text-sm font-medium"
                style={{ color: "var(--cg-ink)" }}
              >
                {customer.name}
              </div>
              <div
                className="text-[11px]"
                style={{ color: "var(--cg-ink-soft)" }}
              >
                {formatDate(nextDate)} · {relative(daysUntil)}
              </div>
            </div>
            {daysUntil === 0 && (
              <span
                className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full"
                style={{
                  background: "var(--cg-coffee)",
                  color: "#fff",
                }}
              >
                Vandaag
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
