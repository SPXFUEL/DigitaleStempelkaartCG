"use client";

import { useTransition } from "react";
import type { Locale } from "@/lib/i18n";

/**
 * Minimalistische NL/EN-switcher. Zet de `cg_locale`-cookie via een
 * server-action en herlaadt de pagina. Geen client-side state nodig —
 * de server bepaalt elke render welke taal.
 */
export default function LangSwitcher({ current }: { current: Locale }) {
  const [pending, start] = useTransition();

  async function setLocale(loc: Locale) {
    start(async () => {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: loc }),
      });
      // Volledige reload zodat server-rendered strings opnieuw worden opgehaald.
      window.location.reload();
    });
  }

  return (
    <div className="flex items-center gap-1 text-xs">
      {(["nl", "en"] as Locale[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          disabled={pending || current === l}
          className="px-2 py-1 rounded"
          style={{
            background: current === l ? "var(--cg-coffee-dark)" : "transparent",
            color: current === l ? "#fff" : "var(--cg-ink-soft)",
          }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
