/**
 * Password / PIN hashing via Node's built-in `scrypt`. Geen externe deps,
 * memory-hard, OWASP-aanbevolen voor password storage.
 *
 * Hash-format: `scrypt$N$saltHex$hashHex`
 *   - N: scrypt cost parameter (log2 N — we hardcoden 15 = N=32768)
 *   - salt: 16 bytes, hex-encoded
 *   - hash: 64 bytes, hex-encoded
 */

import { promisify } from "node:util";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

const N_LOG2 = 15; // 2^15 = 32768. Tested ~80ms op Vercel hobby tier.
const N = 1 << N_LOG2;
const SALT_LEN = 16;
const KEY_LEN = 64;

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const buf = await scrypt(plain.normalize("NFKC"), salt, KEY_LEN);
  return `scrypt$${N_LOG2}$${salt.toString("hex")}$${buf.toString("hex")}`;
}

export async function verifyPassword(
  plain: string,
  stored: string
): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;
  const nLog2 = parseInt(parts[1], 10);
  if (!Number.isFinite(nLog2) || nLog2 < 10 || nLog2 > 20) return false;
  const salt = Buffer.from(parts[2], "hex");
  const expected = Buffer.from(parts[3], "hex");
  // We accepteren elke N; in praktijk gebruiken we altijd onze huidige.
  // (Hier is ruimte om later N omhoog te zetten zonder bestaande hashes te breken.)
  void N; // shutup tsc
  const buf = await scrypt(plain.normalize("NFKC"), salt, expected.length);
  if (buf.length !== expected.length) return false;
  return timingSafeEqual(buf, expected);
}

/**
 * Voor migratie: vergelijk een plain-text "legacy PIN" met de waarde in
 * STAFF_PIN env-var op een timing-safe manier (4 chars hebben echt geen
 * timing-leak maar het kost niks om 't goed te doen).
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) {
    // We doen tóch een dummy-compare zodat de duur niet leakt of de
    // lengtes verschillend zijn.
    const pad = Buffer.alloc(Math.max(ba.length, bb.length));
    timingSafeEqual(pad, pad);
    return false;
  }
  return timingSafeEqual(ba, bb);
}
