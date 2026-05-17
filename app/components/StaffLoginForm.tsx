"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StaffLoginForm() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Onjuiste PIN.");
        return;
      }
      router.push("/staff");
      router.refresh();
    } catch {
      setError("Geen verbinding.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block">
        <span
          className="block text-sm font-medium mb-1.5"
          style={{ color: "var(--cg-ink-soft)" }}
        >
          PIN
        </span>
        <input
          type="password"
          inputMode="numeric"
          className="cg-input text-center text-2xl tracking-widest"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          autoFocus
          autoComplete="off"
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
        disabled={busy || pin.length < 1}
      >
        {busy ? "Bezig…" : "Inloggen"}
      </button>
    </form>
  );
}
