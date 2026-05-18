"use client";

import { useEffect } from "react";

export default function SWRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let reloadedOnce = false;

    function onMessage(e: MessageEvent) {
      const data = e.data as { type?: string } | null;
      if (data?.type === "sw-updated" && !reloadedOnce) {
        // Voorkom oneindige reload-loop: 1x per pageview
        reloadedOnce = true;
        window.location.reload();
      }
    }

    navigator.serviceWorker.addEventListener("message", onMessage);

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Check direct of er een update is en pas die toe
          reg.update().catch(() => {});
        })
        .catch(() => {
          /* SW-registratie faalt → app blijft prima werken zonder */
        });
    };

    if (document.readyState === "complete") {
      onLoad();
    } else {
      window.addEventListener("load", onLoad);
    }

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      window.removeEventListener("load", onLoad);
    };
  }, []);

  return null;
}
