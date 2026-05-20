"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const REFERRAL_STORAGE_KEY = "cg:referral";

export default function EnrollForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [referredBy, setReferredBy] = useState<string | null>(null);

  // Pak ?ref=<uuid> uit de URL of uit localStorage (zodat 't refresh-bestendig
  // is en blijft hangen als de klant eerst de PWA installeert).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlRef = search.get("ref");
    if (urlRef && /^[0-9a-f-]{20,}$/i.test(urlRef)) {
      window.localStorage.setItem(REFERRAL_STORAGE_KEY, urlRef);
      setReferredBy(urlRef);
      return;
    }
    const stored = window.localStorage.getItem(REFERRAL_STORAGE_KEY);
    if (stored) setReferredBy(stored);
  }, [search]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email: email || undefined,
          birthday: birthday || undefined,
          referredBy: referredBy || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Er ging iets mis.");
        return;
      }
      // Schoonmaken — referral is gebruikt.
      try {
        window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
      } catch {
        /* noop */
      }
      router.push("/profiel");
      router.refresh();
    } catch {
      setError("Geen verbinding met de server.");
    } finally {
      setBusy(false);
    }
  }

  // Max date: vandaag (om belachelijke toekomst-datums te voorkomen)
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {referredBy && (
        <div
          className="rounded-xl p-3 text-sm"
          style={{
            background: "var(--cg-cream)",
            color: "var(--cg-coffee-dark)",
          }}
        >
          🎁 Je bent uitgenodigd door een vriend. Jullie krijgen samen een
          bonus-stempel zodra je je eerste drankje haalt.
        </div>
      )}
      <label className="block">
        <span
          className="block text-sm font-medium mb-1.5"
          style={{ color: "var(--cg-ink-soft)" }}
        >
          Je voornaam
        </span>
        <input
          type="text"
          className="cg-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Bijv. Sanne"
          autoComplete="given-name"
          required
          minLength={2}
          maxLength={80}
        />
      </label>
      <label className="block">
        <span
          className="block text-sm font-medium mb-1.5"
          style={{ color: "var(--cg-ink-soft)" }}
        >
          E-mail <span className="opacity-60">(optioneel)</span>
        </span>
        <input
          type="email"
          className="cg-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="zodat we je kunnen herinneren"
          autoComplete="email"
        />
        {email && (
          <span
            className="block text-[11px] mt-1.5"
            style={{ color: "var(--cg-ink-soft)" }}
          >
            Je krijgt een bevestigings-link in je inbox.
          </span>
        )}
      </label>
      <label className="block">
        <span
          className="block text-sm font-medium mb-1.5"
          style={{ color: "var(--cg-ink-soft)" }}
        >
          Geboortedatum 🎂{" "}
          <span className="opacity-60">(optioneel — voor een tractatie)</span>
        </span>
        <input
          type="date"
          className="cg-input"
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
          max={today}
          min="1900-01-01"
        />
      </label>
      {error && (
        <p className="text-sm" style={{ color: "var(--cg-danger)" }}>
          {error}
        </p>
      )}
      <button
        type="submit"
        className="cg-btn-primary w-full"
        disabled={busy || name.trim().length < 2}
      >
        {busy ? "Bezig…" : "Stempelkaart aanmaken"}
      </button>
      <p
        className="text-[11px] text-center pt-1"
        style={{ color: "var(--cg-ink-soft)" }}
      >
        Door verder te gaan ga je akkoord met ons{" "}
        <a
          href="/privacy"
          className="underline"
          style={{ color: "var(--cg-coffee-dark)" }}
        >
          privacy-beleid
        </a>
        .
      </p>
    </form>
  );
}
