"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "desktop" | "standalone" | "unknown";

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "unknown";
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true;
  if (standalone) return "standalone";
  const ua = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

export default function InstallPWA() {
  const [platform, setPlatform] = useState<Platform>("unknown");
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showIosSteps, setShowIosSteps] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (platform === "standalone" || platform === "unknown") return null;

  if (platform === "ios") {
    return (
      <div className="cg-card p-5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--cg-cream)" }}
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="var(--cg-coffee-dark)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3v12" />
              <path d="m7 8 5-5 5 5" />
              <path d="M5 21h14" />
            </svg>
          </span>
          <div className="flex-1">
            <h3
              className="font-semibold text-base"
              style={{ color: "var(--cg-coffee-dark)" }}
            >
              Zet 'm op je beginscherm
            </h3>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--cg-ink-soft)" }}
            >
              Zo open je 'm met één tik, net als een app.
            </p>
            <button
              type="button"
              onClick={() => setShowIosSteps((v) => !v)}
              className="mt-3 text-sm font-semibold underline"
              style={{ color: "var(--cg-coffee-dark)" }}
            >
              {showIosSteps ? "Verberg uitleg" : "Hoe doe ik dat?"}
            </button>
            {showIosSteps && (
              <ol
                className="mt-3 space-y-2 text-sm list-decimal pl-5"
                style={{ color: "var(--cg-ink)" }}
              >
                <li>
                  Tik op de <strong>Deel-knop</strong>{" "}
                  <span aria-hidden>↗</span> onderin Safari.
                </li>
                <li>
                  Scroll naar <strong>"Zet op beginscherm"</strong>.
                </li>
                <li>
                  Tik <strong>Voeg toe</strong> rechtsboven.
                </li>
              </ol>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cg-card p-5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: "var(--cg-cream)" }}
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="var(--cg-coffee-dark)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3v12" />
            <path d="m7 8 5-5 5 5" />
            <path d="M5 21h14" />
          </svg>
        </span>
        <div className="flex-1">
          <h3
            className="font-semibold text-base"
            style={{ color: "var(--cg-coffee-dark)" }}
          >
            Installeer op je telefoon
          </h3>
          <p className="text-sm mt-1" style={{ color: "var(--cg-ink-soft)" }}>
            Eén tik en je hebt 'm bij de hand.
          </p>
          <button
            type="button"
            className="cg-btn-secondary mt-3 text-sm"
            disabled={!deferredPrompt}
            onClick={async () => {
              if (!deferredPrompt) return;
              await deferredPrompt.prompt();
              await deferredPrompt.userChoice;
              setDeferredPrompt(null);
            }}
          >
            {deferredPrompt
              ? "Installeren"
              : "Tik op het menu van je browser → 'App installeren'"}
          </button>
        </div>
      </div>
    </div>
  );
}
