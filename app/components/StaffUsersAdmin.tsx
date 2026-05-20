"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface UserRow {
  id: string;
  name: string;
  role: "barista" | "admin";
  createdAt: string;
  lastLoginAt?: string;
  deactivatedAt?: string;
}

interface Props {
  users: UserRow[];
  callerId: string | null;
  isBootstrap: boolean;
}

const DUTCH_DTF = new Intl.DateTimeFormat("nl-NL", {
  timeZone: "Europe/Amsterdam",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default function StaffUsersAdmin({
  users,
  callerId,
  isBootstrap,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<"barista" | "admin">(
    isBootstrap ? "admin" : "barista"
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const res = await fetch("/api/staff/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role, pin }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Aanmaken mislukt");
        return;
      }
      setInfo(
        isBootstrap
          ? "Eerste admin-account aangemaakt. Log opnieuw in met de zojuist gekozen PIN."
          : "Account aangemaakt."
      );
      setName("");
      setPin("");
      router.refresh();
    } catch {
      setError("Geen verbinding");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Account uitschakelen? Account blijft in audit-log staan."))
      return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff/users/${id}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Uitschakelen mislukt");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {isBootstrap && (
        <div
          className="cg-card p-4 text-sm"
          style={{
            background: "var(--cg-cream)",
            color: "var(--cg-coffee-dark)",
          }}
        >
          🚀 Nog geen accounts — de eerste die je hier aanmaakt wordt
          automatisch admin. Daarna kan je verder als deze gebruiker.
        </div>
      )}

      <form className="cg-card p-5 space-y-3" onSubmit={handleCreate}>
        <h2
          className="text-base font-semibold"
          style={{ color: "var(--cg-coffee-dark)" }}
        >
          Nieuw account
        </h2>
        <label className="block">
          <span
            className="block text-xs mb-1.5"
            style={{ color: "var(--cg-ink-soft)" }}
          >
            Naam
          </span>
          <input
            type="text"
            className="cg-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={40}
          />
        </label>
        <label className="block">
          <span
            className="block text-xs mb-1.5"
            style={{ color: "var(--cg-ink-soft)" }}
          >
            Persoonlijke PIN (4–8 cijfers)
          </span>
          <input
            type="password"
            inputMode="numeric"
            className="cg-input text-center tracking-widest"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
            minLength={4}
            maxLength={8}
            pattern="\d{4,8}"
          />
        </label>
        {!isBootstrap && (
          <label className="block">
            <span
              className="block text-xs mb-1.5"
              style={{ color: "var(--cg-ink-soft)" }}
            >
              Rol
            </span>
            <select
              className="cg-input"
              value={role}
              onChange={(e) =>
                setRole(e.target.value === "admin" ? "admin" : "barista")
              }
            >
              <option value="barista">Barista (mag stempelen)</option>
              <option value="admin">Admin (kan ook accounts beheren)</option>
            </select>
          </label>
        )}
        {error && (
          <p className="text-sm" style={{ color: "var(--cg-danger)" }}>
            {error}
          </p>
        )}
        {info && (
          <p className="text-sm" style={{ color: "var(--cg-leaf-dark)" }}>
            {info}
          </p>
        )}
        <button
          type="submit"
          className="cg-btn-primary w-full"
          disabled={busy || name.trim().length < 2 || !/^\d{4,8}$/.test(pin)}
        >
          {busy ? "Bezig…" : "Account aanmaken"}
        </button>
      </form>

      <section className="cg-card">
        <ul className="divide-y" style={{ borderColor: "var(--cg-line)" }}>
          {users.length === 0 && (
            <li className="p-5 text-sm" style={{ color: "var(--cg-ink-soft)" }}>
              Nog geen accounts.
            </li>
          )}
          {users.map((u) => (
            <li
              key={u.id}
              className="p-4 flex items-center justify-between gap-3"
            >
              <div>
                <div
                  className="text-sm font-medium"
                  style={{
                    color: u.deactivatedAt
                      ? "var(--cg-ink-soft)"
                      : "var(--cg-ink)",
                  }}
                >
                  {u.name}
                  <span
                    className="ml-2 text-[11px] uppercase font-semibold tracking-wider"
                    style={{
                      color:
                        u.role === "admin"
                          ? "var(--cg-coffee-dark)"
                          : "var(--cg-ink-soft)",
                    }}
                  >
                    {u.role}
                  </span>
                  {u.deactivatedAt && (
                    <span
                      className="ml-2 text-[10px]"
                      style={{ color: "var(--cg-danger)" }}
                    >
                      uitgeschakeld
                    </span>
                  )}
                </div>
                <div
                  className="text-[11px] font-mono"
                  style={{ color: "var(--cg-ink-soft)" }}
                >
                  {u.lastLoginAt
                    ? `Laatst: ${DUTCH_DTF.format(new Date(u.lastLoginAt))}`
                    : "Nog niet ingelogd"}
                </div>
              </div>
              {!u.deactivatedAt && callerId && u.id !== callerId && (
                <button
                  type="button"
                  onClick={() => handleDeactivate(u.id)}
                  className="text-xs underline"
                  style={{ color: "var(--cg-danger)" }}
                  disabled={busy}
                >
                  Uitschakelen
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
