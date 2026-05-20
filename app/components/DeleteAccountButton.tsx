"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * AVG art. 17 — recht op verwijdering. Klant kan zelf op /profiel z'n
 * complete stempelkaart wissen. Two-step confirmation om typo's te voorkomen.
 */
export default function DeleteAccountButton() {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirm" | "busy">("idle");
  const [error, setError] = useState<string | null>(null);

  async function reallyDelete() {
    setStep("busy");
    setError(null);
    try {
      const res = await fetch("/api/customer/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Verwijderen mislukt");
        setStep("confirm");
        return;
      }
      router.push("/welkom");
      router.refresh();
    } catch {
      setError("Geen verbinding");
      setStep("confirm");
    }
  }

  if (step === "idle") {
    return (
      <div className="text-center">
        <button
          type="button"
          onClick={() => setStep("confirm")}
          className="text-xs underline"
          style={{ color: "var(--cg-ink-soft)" }}
        >
          Verwijder mijn stempelkaart
        </button>
      </div>
    );
  }

  return (
    <section className="cg-card p-5">
      <p
        className="text-sm font-semibold"
        style={{ color: "var(--cg-danger)" }}
      >
        Weet je het zeker?
      </p>
      <p className="text-sm mt-1" style={{ color: "var(--cg-ink-soft)" }}>
        Je stempels, drankjes-totaal en geschiedenis worden definitief gewist.
        Dit kan niet ongedaan gemaakt worden.
      </p>
      {error && (
        <p className="text-sm mt-2" style={{ color: "var(--cg-danger)" }}>
          {error}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="cg-btn-secondary flex-1"
          onClick={() => {
            setStep("idle");
            setError(null);
          }}
          disabled={step === "busy"}
        >
          Annuleren
        </button>
        <button
          type="button"
          className="cg-btn-primary flex-1"
          style={{ background: "var(--cg-danger)" }}
          onClick={reallyDelete}
          disabled={step === "busy"}
        >
          {step === "busy" ? "Bezig…" : "Ja, verwijder"}
        </button>
      </div>
    </section>
  );
}
