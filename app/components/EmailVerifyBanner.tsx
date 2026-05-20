"use client";

import { useState } from "react";

interface Props {
  email: string;
}

/**
 * Banner die getoond wordt op /profiel als de klant wel een e-mail heeft
 * opgegeven maar nog niet op de bevestigingslink heeft geklikt.
 */
export default function EmailVerifyBanner({ email }: Props) {
  const [status, setStatus] = useState<"idle" | "busy" | "sent" | "err">(
    "idle"
  );
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function resend() {
    setStatus("busy");
    setErrMsg(null);
    try {
      const res = await fetch("/api/customer/request-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setErrMsg(data.error ?? "Versturen mislukt");
        setStatus("err");
        return;
      }
      setStatus("sent");
    } catch {
      setErrMsg("Geen verbinding");
      setStatus("err");
    }
  }

  return (
    <section
      className="cg-card p-4 text-sm flex items-start gap-3"
      style={{ background: "#fff8e7", borderColor: "#ecd17a" }}
    >
      <span aria-hidden className="text-xl">
        ✉️
      </span>
      <div className="flex-1">
        <p style={{ color: "var(--cg-coffee-dark)" }}>
          We hebben een bevestigingslink gestuurd naar <strong>{email}</strong>.
          Klik er op zodat we je seintjes kunnen sturen.
        </p>
        {status === "sent" && (
          <p className="mt-1 text-xs" style={{ color: "var(--cg-leaf-dark)" }}>
            Nieuwe link verstuurd — kijk ook in je spam-folder.
          </p>
        )}
        {status === "err" && errMsg && (
          <p className="mt-1 text-xs" style={{ color: "var(--cg-danger)" }}>
            {errMsg}
          </p>
        )}
        <button
          type="button"
          onClick={resend}
          disabled={status === "busy" || status === "sent"}
          className="mt-2 text-xs underline"
          style={{ color: "var(--cg-coffee-dark)" }}
        >
          {status === "busy"
            ? "Bezig…"
            : status === "sent"
              ? "Verstuurd ✓"
              : "Mail niet ontvangen? Stuur opnieuw"}
        </button>
      </div>
    </section>
  );
}
