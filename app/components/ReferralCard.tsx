"use client";

import { useState } from "react";
import { BRAND_NAME } from "@/lib/constants";

interface Props {
  customerId: string;
  referralsCount: number;
}

/**
 * Klant deelt z'n eigen QR-link met een vriend → vriend meldt zich aan via
 * /welkom?ref=<uuid> → zodra die z'n eerste betaalde stempel haalt, krijgt
 * de uitnodiger een bonus-stempel (zie /api/stamp route).
 */
export default function ReferralCard({ customerId, referralsCount }: Props) {
  const [copied, setCopied] = useState(false);
  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/welkom?ref=${customerId}`
      : `/welkom?ref=${customerId}`;

  async function share() {
    const shareData = {
      title: `${BRAND_NAME} stempelkaart`,
      text: `Spaar voor een gratis drankje bij ${BRAND_NAME}. Meld je aan via mijn link, dan krijgen we samen een bonus-stempel.`,
      url: link,
    };
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        /* user cancelled — val terug naar clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard geblokkeerd */
    }
  }

  return (
    <section className="cg-card p-5">
      <h2
        className="text-base font-semibold"
        style={{ color: "var(--cg-coffee-dark)" }}
      >
        🤝 Vriend uitnodigen
      </h2>
      <p className="text-sm mt-1" style={{ color: "var(--cg-ink-soft)" }}>
        Stuur je vriend deze link. Zodra zij hun eerste drankje halen, krijg jij
        een gratis bonus-stempel — en zij ook.
      </p>
      <button
        type="button"
        onClick={share}
        className="cg-btn-secondary mt-3 w-full text-sm"
      >
        {copied ? "Link gekopieerd ✓" : "Deel mijn uitnodiging"}
      </button>
      {referralsCount > 0 && (
        <p
          className="text-[11px] mt-2 text-center"
          style={{ color: "var(--cg-ink-soft)" }}
        >
          Je hebt al {referralsCount}{" "}
          {referralsCount === 1 ? "vriend" : "vrienden"} uitgenodigd 🙌
        </p>
      )}
    </section>
  );
}
