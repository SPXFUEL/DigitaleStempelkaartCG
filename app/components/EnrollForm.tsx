"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EnrollForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Er ging iets mis.");
        return;
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
    </form>
  );
}
