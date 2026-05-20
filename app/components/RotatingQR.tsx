"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface Props {
  /** Eerste QR die server-side al klaar is (data-URL) — voor instant paint. */
  initialDataUrl: string;
  /** Eerste token, gegenereerd op de server bij SSR. */
  initialToken: string;
  /** Hoe vaak refreshen (in ms). Default 10s. */
  refreshMs?: number;
}

/**
 * Toont een roterende klant-QR. Bij mount fetch'en we een nieuw token van
 * /api/qr-token elke `refreshMs`. Bij netwerk-fail blijft de oude QR
 * gewoon staan (failsafe — barista kan altijd handmatig ID intypen).
 *
 * Ook: vraagt `screen.wakeLock` aan zodat het scherm niet dimmt terwijl
 * de klant z'n telefoon laat zien aan de barista.
 */
export default function RotatingQR({
  initialDataUrl,
  initialToken,
  refreshMs = 10_000,
}: Props) {
  const [dataUrl, setDataUrl] = useState(initialDataUrl);
  const [token, setToken] = useState(initialToken);
  const [stale, setStale] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const renderQr = useCallback(async (value: string) => {
    try {
      const url = await QRCode.toDataURL(value, {
        width: 480,
        margin: 1,
        color: { dark: "#2a1a10", light: "#ffffff" },
        errorCorrectionLevel: "M",
      });
      setDataUrl(url);
      setStale(false);
    } catch (err) {
      console.warn("[qr] render failed:", err);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/qr-token", { cache: "no-store" });
      if (!res.ok) {
        setStale(true);
        return;
      }
      const data = (await res.json()) as { token?: string };
      if (data.token && data.token !== token) {
        setToken(data.token);
        await renderQr(data.token);
      }
    } catch {
      setStale(true);
    }
  }, [renderQr, token]);

  // Polling
  useEffect(() => {
    const id = setInterval(() => {
      void refresh();
    }, refreshMs);
    // Direct refresh als de tab weer focus krijgt — anders zie je een
    // oude/verlopen QR bij terugkomen uit de achtergrond.
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, refreshMs]);

  // WakeLock
  useEffect(() => {
    let released = false;
    async function acquire() {
      try {
        if (!("wakeLock" in navigator)) return;
        const wl = await navigator.wakeLock.request("screen");
        if (released) {
          await wl.release();
          return;
        }
        wakeLockRef.current = wl;
        wl.addEventListener("release", () => {
          wakeLockRef.current = null;
        });
      } catch {
        /* permission denied of tab niet visible — niet kritiek */
      }
    }
    void acquire();
    const onVisible = () => {
      if (document.visibilityState === "visible" && !wakeLockRef.current) {
        void acquire();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      released = true;
      document.removeEventListener("visibilitychange", onVisible);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, []);

  return (
    <div
      className="mx-auto rounded-2xl p-3 inline-block relative"
      style={{ background: "#fff", border: "1px solid var(--cg-line)" }}
    >
      <img
        src={dataUrl}
        alt="Stempelkaart QR-code"
        width={240}
        height={240}
        style={{ display: "block", opacity: stale ? 0.55 : 1 }}
      />
      {stale && (
        <p
          className="mt-2 text-[11px] text-center"
          style={{ color: "var(--cg-danger)" }}
        >
          Geen verbinding — toon dit aan de barista en probeer opnieuw.
        </p>
      )}
    </div>
  );
}
