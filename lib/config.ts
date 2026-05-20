/**
 * Centrale runtime-config. Eén plek om env-vars te lezen + valideren.
 *
 * Server-side velden mogen GEEN `NEXT_PUBLIC_` prefix hebben.
 * Velden die je in de browser bundle wil moeten dat prefix hebben.
 */

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.toLowerCase();
  if (raw === undefined || raw === "") return fallback;
  return raw === "1" || raw === "true" || raw === "yes";
}

export const config = {
  /** Aantal stempels voor een gratis drankje. Default 7. */
  stampsForReward: envInt("STAMPS_FOR_REWARD", 7),

  /** Geeft elke nieuwe klant direct 1 gratis stempel. */
  welcomeBonus: envBool("WELCOME_BONUS_STAMP", true),

  /**
   * Stempel-cooldown in seconden. Voorkomt dat een dubbele tap binnen X
   * seconden 2 stempels oplevert. 0 = uit.
   */
  stampCooldownSec: envInt("STAMP_COOLDOWN_SEC", 30),

  /**
   * QR-token TTL in seconden. Customer-QR roteert; barista accepteert
   * tokens die maximaal X seconden oud zijn. Default 60s.
   */
  qrTokenTtlSec: envInt("QR_TOKEN_TTL_SEC", 60),

  /**
   * Aantal mispogingen op /staff/login per IP voordat we 'm 5 min op slot
   * zetten. 0 = uit (alleen voor lokale dev).
   */
  loginRateLimit: envInt("LOGIN_RATE_LIMIT", 5),

  /**
   * Lockout-duur in seconden na te veel mispogingen.
   */
  loginLockoutSec: envInt("LOGIN_LOCKOUT_SEC", 300),

  /**
   * Window in seconden waarbinnen een barista een stempel kan terugdraaien.
   */
  undoWindowSec: envInt("UNDO_WINDOW_SEC", 60),

  /**
   * Bewaartermijn voor inactieve klanten (in dagen). Klanten zonder events
   * en niet bezocht in N dagen worden door de cleanup-cron verwijderd.
   * 0 = nooit auto-deleten.
   */
  inactiveRetentionDays: envInt("INACTIVE_RETENTION_DAYS", 365),

  /**
   * Plausible domain (bv. "stempel.coffeegarden.nl"). Leeg = analytics uit.
   */
  plausibleDomain: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? "",

  /**
   * Plausible script-host (zelf-gehost of plausible.io).
   */
  plausibleSrc:
    process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ??
    "https://plausible.io/js/script.js",

  /**
   * Sentry DSN. Leeg = error-tracking uit.
   */
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? "",

  /**
   * Resend API key (transactional mails). Leeg = e-mail uit, console-log fallback.
   */
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom:
    process.env.EMAIL_FROM ?? "Coffee Garden <noreply@coffeegarden.nl>",

  /**
   * Publieke base-URL (voor opt-in links etc.). Vercel zet
   * VERCEL_URL automatisch; lokaal valt 'ie terug op localhost:3000.
   */
  baseUrl:
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000",
} as const;

export type Config = typeof config;
