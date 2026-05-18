"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { STAMPS_FOR_REWARD } from "@/lib/constants";
import type { Customer } from "@/lib/types";

type Toast = { kind: "ok" | "err"; text: string } | null;

function parseScan(raw: string): string | null {
  const text = raw.trim();
  if (text.startsWith("cg:cust:")) return text.slice("cg:cust:".length);
  if (/^[0-9a-f-]{20,}$/i.test(text)) return text;
  return null;
}

export default function StaffDashboard({ recent }: { recent: Customer[] }) {
  const router = useRouter();
  const [scannerOn, setScannerOn] = useState(false);
  const [manualId, setManualId] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [busy, setBusy] = useState(false);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const containerId = "cg-staff-reader";

  const flash = useCallback((t: Toast) => {
    setToast(t);
    if (t) setTimeout(() => setToast(null), 2500);
  }, []);

  const loadCustomer = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/staff/customer/${encodeURIComponent(id)}`);
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        flash({ kind: "err", text: data.error ?? "Klant niet gevonden" });
        return;
      }
      const data = (await res.json()) as { customer: Customer };
      setSelected(data.customer);
    },
    [flash]
  );

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        /* noop */
      }
      scannerRef.current = null;
    }
    setScannerOn(false);
  }, []);

  const startScanner = useCallback(async () => {
    setScannerOn(true);
    try {
      const mod = await import("html5-qrcode");
      const instance = new mod.Html5Qrcode(containerId);
      scannerRef.current = instance;
      await instance.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decoded) => {
          const id = parseScan(decoded);
          if (!id) {
            flash({ kind: "err", text: "Geen geldige Coffee Garden QR" });
            return;
          }
          await stopScanner();
          await loadCustomer(id);
        },
        () => {
          /* scan errors per frame: ignore */
        }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Kon camera niet starten";
      flash({ kind: "err", text: msg });
      setScannerOn(false);
    }
  }, [flash, loadCustomer, stopScanner]);

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  async function handleStamp() {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch("/api/stamp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: selected.id }),
      });
      const data = (await res.json()) as { customer?: Customer; error?: string };
      if (!res.ok || !data.customer) {
        flash({ kind: "err", text: data.error ?? "Stempel mislukt" });
        return;
      }
      setSelected(data.customer);
      flash({
        kind: "ok",
        text: data.customer.rewardAvailable
          ? `${data.customer.name}: kaart vol — gratis drankje!`
          : `${data.customer.name}: ${data.customer.stamps}/${STAMPS_FOR_REWARD}`,
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRedeem() {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: selected.id }),
      });
      const data = (await res.json()) as { customer?: Customer; error?: string };
      if (!res.ok || !data.customer) {
        flash({ kind: "err", text: data.error ?? "Inwisselen mislukt" });
        return;
      }
      setSelected(data.customer);
      flash({ kind: "ok", text: `Gratis drankje voor ${data.customer.name}!` });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleRedeemBirthday() {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch("/api/redeem-birthday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: selected.id }),
      });
      const data = (await res.json()) as { customer?: Customer; error?: string };
      if (!res.ok || !data.customer) {
        flash({ kind: "err", text: data.error ?? "Inwisselen mislukt" });
        return;
      }
      setSelected(data.customer);
      flash({
        kind: "ok",
        text: `🎂 Verjaardags-tractatie voor ${data.customer.name}!`,
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/staff/logout", { method: "POST" });
    router.push("/staff/login");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <section className="cg-card p-5">
        <div className="flex items-center justify-between">
          <h1
            className="text-lg font-semibold"
            style={{ color: "var(--cg-coffee-dark)" }}
          >
            Stempel toevoegen
          </h1>
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs underline"
            style={{ color: "var(--cg-ink-soft)" }}
          >
            Uitloggen
          </button>
        </div>

        <div className="mt-4">
          {!scannerOn ? (
            <button
              type="button"
              className="cg-btn-primary w-full"
              onClick={startScanner}
            >
              Camera openen & QR scannen
            </button>
          ) : (
            <>
              <div
                id={containerId}
                className="w-full overflow-hidden rounded-2xl"
                style={{ minHeight: 260, background: "#000" }}
              />
              <button
                type="button"
                className="cg-btn-secondary w-full mt-3"
                onClick={stopScanner}
              >
                Camera stoppen
              </button>
            </>
          )}
        </div>

        <div className="mt-4">
          <label className="block">
            <span
              className="block text-xs font-medium mb-1.5"
              style={{ color: "var(--cg-ink-soft)" }}
            >
              Of plak/typ een klant-ID
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                className="cg-input"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="cg:cust:... of UUID"
              />
              <button
                type="button"
                className="cg-btn-secondary px-4"
                onClick={() => {
                  const id = parseScan(manualId);
                  if (!id) {
                    flash({ kind: "err", text: "Ongeldig ID" });
                    return;
                  }
                  void loadCustomer(id);
                }}
              >
                Zoek
              </button>
            </div>
          </label>
        </div>
      </section>

      {selected && (
        <section className="cg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2
                className="text-lg font-semibold flex items-center gap-2"
                style={{ color: "var(--cg-coffee-dark)" }}
              >
                {selected.name}
                {selected.birthdayActive && (
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: "var(--cg-cream)",
                      color: "var(--cg-coffee-dark)",
                    }}
                  >
                    🎂 Jarig vandaag
                  </span>
                )}
              </h2>
              <p
                className="text-xs font-mono"
                style={{ color: "var(--cg-ink-soft)" }}
              >
                {selected.id.slice(0, 8)} · {selected.totalDrinks} drankjes totaal
              </p>
            </div>
            <button
              type="button"
              className="text-xs underline"
              style={{ color: "var(--cg-ink-soft)" }}
              onClick={() => setSelected(null)}
            >
              Sluit
            </button>
          </div>

          <div className="mt-3 text-3xl font-bold tracking-tight">
            {selected.stamps}{" "}
            <span
              className="text-base font-normal"
              style={{ color: "var(--cg-ink-soft)" }}
            >
              / {STAMPS_FOR_REWARD}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2">
            {selected.birthdayActive && (
              <button
                type="button"
                className="cg-btn-primary"
                disabled={busy}
                onClick={handleRedeemBirthday}
                style={{ background: "#c97a3b" }}
              >
                {busy ? "Bezig…" : "🎂 Verjaardags-tractatie inwisselen"}
              </button>
            )}
            {selected.rewardAvailable ? (
              <button
                type="button"
                className="cg-btn-primary"
                disabled={busy}
                onClick={handleRedeem}
                style={{ background: "var(--cg-leaf)" }}
              >
                {busy ? "Bezig…" : "🎉 Gratis drankje inwisselen"}
              </button>
            ) : (
              <button
                type="button"
                className="cg-btn-primary"
                disabled={busy}
                onClick={handleStamp}
              >
                {busy ? "Bezig…" : "Stempel +1"}
              </button>
            )}
          </div>
        </section>
      )}

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-full text-sm font-medium shadow-lg"
          style={{
            background:
              toast.kind === "ok" ? "var(--cg-leaf-dark)" : "var(--cg-danger)",
            color: "#fff",
            zIndex: 50,
          }}
          role="status"
        >
          {toast.text}
        </div>
      )}

      <section className="cg-card p-5">
        <h2
          className="text-sm font-semibold mb-3"
          style={{ color: "var(--cg-coffee-dark)" }}
        >
          Recent
        </h2>
        {recent.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--cg-ink-soft)" }}>
            Nog geen klanten ingeschreven.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--cg-line)" }}>
            {recent.map((c) => (
              <li key={c.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    {c.name}
                    {c.birthdayActive && <span aria-label="Jarig vandaag">🎂</span>}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "var(--cg-ink-soft)" }}
                  >
                    {c.stamps}/{STAMPS_FOR_REWARD}
                    {c.rewardAvailable && " · gratis drankje klaar"}
                    {c.birthdayActive && " · 🎂 verjaardags-tractatie"}
                  </div>
                </div>
                <button
                  type="button"
                  className="text-xs underline"
                  style={{ color: "var(--cg-coffee-dark)" }}
                  onClick={() => void loadCustomer(c.id)}
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
