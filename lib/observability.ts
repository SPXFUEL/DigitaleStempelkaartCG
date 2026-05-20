/**
 * Light-touch observability. Als Sentry geconfigureerd is, sturen we errors
 * via hun browser/edge SDK; anders is dit een no-op + console.error.
 *
 * Sentry is opzettelijk een optionele dependency: we willen niet dat de
 * bundle groter wordt als 'm niet wordt gebruikt. Installeer 'm pas als je
 * 'm écht wil aanzetten:
 *
 *   npm install @sentry/nextjs
 *   NEXT_PUBLIC_SENTRY_DSN=https://...@xxx.ingest.sentry.io/yyy
 *
 * De `eval`-trick zorgt dat TypeScript de import niet probeert op te lossen
 * tijdens build — als de package niet aanwezig is, valt 'ie keurig terug
 * op console.error.
 */

import { config } from "./config";

interface SentryLike {
  init(opts: Record<string, unknown>): void;
  captureException(err: unknown, opts?: Record<string, unknown>): void;
  captureMessage(msg: string, opts?: Record<string, unknown>): void;
}

let initialized = false;
let sentry: SentryLike | null = null;

async function ensureSentry(): Promise<SentryLike | null> {
  if (!config.sentryDsn) return null;
  if (initialized) return sentry;
  initialized = true;
  try {
    // We gebruiken eval(...) om bundlers/TS te laten denken dat deze import
    // dynamisch en optioneel is. Als '@sentry/nextjs' niet geïnstalleerd
    // is, gooit dit een runtime-error die we keurig opvangen.
    const dyn = new Function("m", "return import(m)") as (
      m: string
    ) => Promise<SentryLike>;
    const mod = await dyn("@sentry/nextjs").catch(() => null);
    if (!mod) return null;
    mod.init({
      dsn: config.sentryDsn,
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
    });
    sentry = mod;
    return sentry;
  } catch (err) {
    console.warn("[observability] Sentry init failed:", err);
    return null;
  }
}

export async function reportError(
  err: unknown,
  context?: Record<string, unknown>
): Promise<void> {
  const s = await ensureSentry();
  if (s) {
    s.captureException(err, { extra: context });
  } else {
    console.error("[error]", err, context);
  }
}

export async function reportMessage(
  msg: string,
  context?: Record<string, unknown>
): Promise<void> {
  const s = await ensureSentry();
  if (s) {
    s.captureMessage(msg, { extra: context });
  } else {
    console.log("[msg]", msg, context ?? "");
  }
}
