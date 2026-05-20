/**
 * HMAC-gebaseerde tokens voor de klant-QR.
 *
 * In plaats van een statisch `cg:cust:<uuid>` (oneindig geldig zodra
 * gescreenshot/gedeeld), genereren we een token met een timestamp en
 * HMAC-signature. De QR roteert elke ~10s; de barista-scanner accepteert
 * tokens binnen `config.qrTokenTtlSec` seconden.
 *
 * Token-format: cg2:<customerId>:<timestamp>:<sig>
 *   - customerId: UUID v4
 *   - timestamp: integer seconden sinds epoch
 *   - sig: HMAC-SHA256 over "<customerId>:<timestamp>" met QR_SIGNING_SECRET,
 *          base64url-encoded, 16 bytes (22 chars) — geeft 128 bit security.
 *
 * Backwards-compatible: de scanner accepteert óók nog `cg:cust:<uuid>` en
 * losse UUIDs (handmatige invoer), zodat oude QRs blijven werken zolang
 * deze deploy nog niet overal de nieuwe QR heeft uitgerold. Dit kun je later
 * uitzetten via `LEGACY_QR_ALLOWED=false`.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { config } from "./config";

const UUID_RE =
  /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
const SIG_LEN_BYTES = 16; // 128-bit truncated HMAC

let cachedSecret: string | null = null;

function getSecret(): string {
  if (cachedSecret) return cachedSecret;
  let secret = process.env.QR_SIGNING_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "QR_SIGNING_SECRET ontbreekt of is < 16 chars. Genereer met: openssl rand -hex 32"
      );
    }
    // In dev: genereer er een en log 'm. Niet veilig, maar consistent voor de sessie.
    secret = randomBytes(32).toString("hex");
    console.warn(
      "[cg] QR_SIGNING_SECRET niet gezet — gebruik tijdelijk:",
      secret.slice(0, 12) + "…"
    );
  }
  cachedSecret = secret;
  return secret;
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4 !== 0) s += "=";
  return Buffer.from(s, "base64");
}

function compute(customerId: string, ts: number): string {
  const mac = createHmac("sha256", getSecret())
    .update(`${customerId}:${ts}`)
    .digest();
  return b64url(mac.subarray(0, SIG_LEN_BYTES));
}

/**
 * Maak een vers QR-token voor deze klant. Roept de tijdsklok zelf aan, of
 * gebruikt de meegegeven `nowSec` voor tests / sub-second rotatie.
 */
export function signQrToken(customerId: string, nowSec?: number): string {
  const ts = nowSec ?? Math.floor(Date.now() / 1000);
  const sig = compute(customerId, ts);
  return `cg2:${customerId}:${ts}:${sig}`;
}

export interface VerifyResult {
  ok: boolean;
  customerId?: string;
  /** Reden bij failure — voor logging, niet user-facing. */
  reason?: string;
  /** True als 'ie via het legacy `cg:cust:<uuid>` of losse UUID-formaat binnenkwam. */
  legacy?: boolean;
}

/**
 * Valideer een scan. Accepteert:
 *  - cg2:<uuid>:<ts>:<sig>  (modern, geldig binnen TTL)
 *  - cg:cust:<uuid>         (legacy, alleen als LEGACY_QR_ALLOWED ≠ "false")
 *  - <uuid>                 (handmatig getypt door barista)
 */
export function verifyScan(input: string, nowSec?: number): VerifyResult {
  const raw = input.trim();
  if (!raw) return { ok: false, reason: "empty" };

  const allowLegacy = (process.env.LEGACY_QR_ALLOWED ?? "true") !== "false";

  // Modern token
  if (raw.startsWith("cg2:")) {
    const parts = raw.slice(4).split(":");
    if (parts.length !== 3) return { ok: false, reason: "format" };
    const [customerId, tsStr, sig] = parts;
    if (!UUID_RE.test(customerId)) return { ok: false, reason: "uuid" };
    const ts = parseInt(tsStr, 10);
    if (!Number.isFinite(ts)) return { ok: false, reason: "ts" };

    const now = nowSec ?? Math.floor(Date.now() / 1000);
    const skew = 5; // tolerantie voor klok-skew
    if (ts > now + skew) return { ok: false, reason: "future" };
    if (now - ts > config.qrTokenTtlSec)
      return { ok: false, reason: "expired" };

    const expected = compute(customerId, ts);
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: "sig" };
    }
    return { ok: true, customerId };
  }

  // Legacy `cg:cust:<uuid>`
  if (raw.startsWith("cg:cust:")) {
    if (!allowLegacy) return { ok: false, reason: "legacy_disabled" };
    const id = raw.slice("cg:cust:".length);
    if (!UUID_RE.test(id)) return { ok: false, reason: "uuid" };
    return { ok: true, customerId: id, legacy: true };
  }

  // Losse UUID (handmatige invoer)
  if (UUID_RE.test(raw)) {
    if (!allowLegacy) return { ok: false, reason: "legacy_disabled" };
    return { ok: true, customerId: raw, legacy: true };
  }

  return { ok: false, reason: "unrecognized" };
}

/**
 * Voor unit-tests — exposeert de signing-functie zodat tests vaste timestamps
 * kunnen testen zonder klok-trucs.
 */
export const __internal = { compute, fromB64url };
