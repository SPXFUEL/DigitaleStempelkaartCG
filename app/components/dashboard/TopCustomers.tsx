import type { Customer } from "@/lib/types";

export default function TopCustomers({
  customers,
}: {
  customers: Customer[];
}) {
  if (customers.length === 0) {
    return (
      <section className="cg-card p-5">
        <h2
          className="text-base font-semibold mb-2"
          style={{ color: "var(--cg-coffee-dark)" }}
        >
          Top klanten
        </h2>
        <p className="text-sm" style={{ color: "var(--cg-ink-soft)" }}>
          Nog geen klanten met activiteit.
        </p>
      </section>
    );
  }

  return (
    <section className="cg-card p-5">
      <h2
        className="text-base font-semibold mb-3"
        style={{ color: "var(--cg-coffee-dark)" }}
      >
        Top klanten
      </h2>
      <ol className="space-y-2">
        {customers.map((c, i) => (
          <li
            key={c.id}
            className="flex items-center justify-between rounded-xl px-3 py-2"
            style={{
              background:
                i === 0 ? "var(--cg-cream)" : "transparent",
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className="text-sm font-bold w-5 text-center"
                style={{
                  color:
                    i === 0
                      ? "var(--cg-coffee-dark)"
                      : "var(--cg-ink-soft)",
                }}
              >
                {i + 1}
              </span>
              <div>
                <div
                  className="text-sm font-medium flex items-center gap-1.5"
                  style={{ color: "var(--cg-ink)" }}
                >
                  {c.name}
                  {c.birthdayActive && <span aria-hidden>🎂</span>}
                  {c.rewardAvailable && <span aria-hidden>🎁</span>}
                </div>
                <div
                  className="text-[11px]"
                  style={{ color: "var(--cg-ink-soft)" }}
                >
                  {c.totalRewards} gratis ingewisseld
                </div>
              </div>
            </div>
            <div
              className="text-base font-bold"
              style={{ color: "var(--cg-coffee-dark)" }}
            >
              {c.totalDrinks}
              <span
                className="text-[10px] font-normal ml-0.5"
                style={{ color: "var(--cg-ink-soft)" }}
              >
                ☕
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
