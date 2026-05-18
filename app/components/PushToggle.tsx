"use client";

import { useCallback, useEffect, useState } from "react";

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buffer;
}

type Status =
  | "loading"
  | "unsupported"
  | "ios-needs-pwa"
  | "denied"
  | "default"
  | "subscribed";

export default function PushToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    const sw = "serviceWorker" in navigator;
    const push = "PushManager" in window;
    const notif = "Notification" in window;

    if (!sw || !push || !notif) {
      setStatus("unsupported");
      return;
    }

    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true;
    if (isIOS && !standalone) {
      setStatus("ios-needs-pwa");
      return;
    }

    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub && Notification.permission === "granted") {
        setStatus("subscribed");
      } else {
        setStatus("default");
      }
    } catch {
      setStatus("default");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    if (!VAPID_KEY) {
      setTestResult("Server-config ontbreekt (VAPID key)");
      return;
    }
    setBusy(true);
    setTestResult(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        await refresh();
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToBuffer(VAPID_KEY),
        });
      }

      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: json.keys,
          userAgent: navigator.userAgent,
        }),
      });
      if (!res.ok) {
        setTestResult("Server kon subscription niet opslaan");
        return;
      }
      setStatus("subscribed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult(`Fout: ${msg}`);
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const disable = useCallback(async () => {
    setBusy(true);
    setTestResult(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("default");
    } finally {
      setBusy(false);
    }
  }, []);

  const sendTest = useCallback(async () => {
    setBusy(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = (await res.json()) as {
        delivered?: number;
        failed?: number;
        error?: string;
      };
      if (data.error) {
        setTestResult(data.error);
      } else if (data.delivered === 0) {
        setTestResult(
          "Geen levering — check of je nog ingeschreven staat en notificaties hebt aanstaan."
        );
      } else {
        setTestResult(
          `Test verstuurd (${data.delivered} apparaat${data.delivered === 1 ? "" : "ten"})`
        );
      }
    } finally {
      setBusy(false);
    }
  }, []);

  if (status === "loading" || status === "unsupported") return null;

  if (status === "ios-needs-pwa") {
    return (
      <section className="cg-card p-5">
        <div className="flex items-start gap-3">
          <span aria-hidden className="text-2xl">
            🔔
          </span>
          <div className="flex-1">
            <h3
              className="font-semibold"
              style={{ color: "var(--cg-coffee-dark)" }}
            >
              Krijg notificaties
            </h3>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--cg-ink-soft)" }}
            >
              iOS kan alleen pushen als je 'm op je beginscherm hebt staan.
              Installeer 'm via de uitleg hierboven, en open dan deze pagina
              opnieuw vanaf je beginscherm.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (status === "denied") {
    return (
      <section className="cg-card p-5">
        <div className="flex items-start gap-3">
          <span aria-hidden className="text-2xl">
            🔕
          </span>
          <div className="flex-1">
            <h3
              className="font-semibold"
              style={{ color: "var(--cg-coffee-dark)" }}
            >
              Notificaties uit
            </h3>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--cg-ink-soft)" }}
            >
              Je hebt ze geblokkeerd. Zet ze aan via je telefoon-instellingen
              (iOS: Instellingen → Notificaties → Coffee Garden).
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="cg-card p-5">
      <div className="flex items-start gap-3">
        <span aria-hidden className="text-2xl">
          🔔
        </span>
        <div className="flex-1">
          <h3
            className="font-semibold"
            style={{ color: "var(--cg-coffee-dark)" }}
          >
            Notificaties
          </h3>
          <p className="text-sm mt-1" style={{ color: "var(--cg-ink-soft)" }}>
            We sturen je een seintje bij een volle kaart of op je verjaardag.
            Niet vaker dan dat — geen spam.
          </p>

          {status === "subscribed" ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={sendTest}
                disabled={busy}
                className="cg-btn-secondary text-sm"
              >
                {busy ? "Bezig…" : "Stuur test"}
              </button>
              <button
                type="button"
                onClick={disable}
                disabled={busy}
                className="cg-btn-secondary text-sm"
                style={{ color: "var(--cg-ink-soft)" }}
              >
                Uitzetten
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={enable}
              disabled={busy}
              className="cg-btn-primary mt-3 w-full"
            >
              {busy ? "Bezig…" : "Notificaties aanzetten"}
            </button>
          )}

          {testResult && (
            <p
              className="mt-2 text-xs"
              style={{ color: "var(--cg-ink-soft)" }}
            >
              {testResult}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
