import type { StampEvent } from "@/lib/types";

interface Props {
  events: StampEvent[];
}

const TYPE_LABEL: Record<StampEvent["type"], string> = {
  stamp: "Stempel",
  redeem: "Gratis drankje ingewisseld",
  birthday: "Verjaardags-tractatie",
  welcome: "Welkomstbonus",
  referral: "Bonus-stempel (vriend kwam langs)",
};

const TYPE_EMOJI: Record<StampEvent["type"], string> = {
  stamp: "☕",
  redeem: "🎉",
  birthday: "🎂",
  welcome: "🎁",
  referral: "🤝",
};

const DUTCH_DTF = new Intl.DateTimeFormat("nl-NL", {
  timeZone: "Europe/Amsterdam",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default function VisitHistory({ events }: Props) {
  const visible = events
    .filter((e) => !e.reversed)
    .slice(-20)
    .reverse();

  return (
    <section className="cg-card p-5">
      <h2
        className="text-base font-semibold mb-3"
        style={{ color: "var(--cg-coffee-dark)" }}
      >
        Recente bezoeken
      </h2>
      {visible.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--cg-ink-soft)" }}>
          Nog geen bezoeken — kom langs voor je eerste stempel!
        </p>
      ) : (
        <ul className="divide-y" style={{ borderColor: "var(--cg-line)" }}>
          {visible.map((e, i) => (
            <li key={`${e.at}-${i}`} className="py-2 flex items-center gap-3">
              <span aria-hidden className="text-lg">
                {TYPE_EMOJI[e.type]}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm leading-tight"
                  style={{ color: "var(--cg-ink)" }}
                >
                  {TYPE_LABEL[e.type]}
                </p>
                <p
                  className="text-[11px]"
                  style={{ color: "var(--cg-ink-soft)" }}
                >
                  {DUTCH_DTF.format(new Date(e.at))}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
