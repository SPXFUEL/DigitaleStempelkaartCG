import { STAMPS_FOR_REWARD } from "@/lib/constants";

export default function StampCard({
  stamps,
  rewardAvailable,
}: {
  stamps: number;
  rewardAvailable: boolean;
}) {
  const slots = Array.from({ length: STAMPS_FOR_REWARD + 1 }, (_, i) => i + 1);
  return (
    <div className="cg-card p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h2
          className="text-base font-semibold"
          style={{ color: "var(--cg-coffee-dark)" }}
        >
          Jouw stempelkaart
        </h2>
        <span className="text-sm" style={{ color: "var(--cg-ink-soft)" }}>
          {rewardAvailable
            ? "Klaar voor gratis koffie!"
            : `${stamps} / ${STAMPS_FOR_REWARD}`}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {slots.map((n) => {
          const filled = n <= stamps;
          const isReward = n === STAMPS_FOR_REWARD + 1;
          if (isReward) {
            return (
              <div
                key={n}
                className={`cg-stamp ${rewardAvailable ? "cg-stamp--reward" : ""}`}
                aria-label="Gratis koffie"
              >
                {rewardAvailable ? "GRATIS" : "★"}
              </div>
            );
          }
          return (
            <div
              key={n}
              className={`cg-stamp ${filled ? "cg-stamp--filled" : ""}`}
              aria-label={`Stempel ${n}`}
            >
              {filled ? (
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17 8h1a4 4 0 0 1 0 8h-1" />
                  <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
                </svg>
              ) : (
                n
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
