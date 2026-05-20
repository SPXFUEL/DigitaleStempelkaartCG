import { cookies } from "next/headers";
import { timingSafeStringEqual } from "./password";

const CUSTOMER_COOKIE = "cg_customer_id";
const STAFF_COOKIE = "cg_staff_session";
const ONE_YEAR = 60 * 60 * 24 * 365;
const ONE_DAY = 60 * 60 * 24;
const TWELVE_HOURS = 60 * 60 * 12;

export async function getCustomerCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(CUSTOMER_COOKIE)?.value ?? null;
}

export async function setCustomerCookie(customerId: string): Promise<void> {
  const jar = await cookies();
  jar.set(CUSTOMER_COOKIE, customerId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });
}

export async function clearCustomerCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(CUSTOMER_COOKIE);
}

/**
 * Staff cookie. Inhoud is óf "ok" (legacy gedeelde PIN, geen audit-trail)
 * óf "u:<staffUserId>" voor per-barista sessies.
 */
export async function getStaffCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(STAFF_COOKIE)?.value ?? null;
}

export async function isStaffAuthenticated(): Promise<boolean> {
  const v = await getStaffCookie();
  return v === "ok" || (typeof v === "string" && v.startsWith("u:"));
}

/**
 * Returnt het staff-user-id als de session aan een specifieke barista hangt,
 * of `null` bij een legacy "ok"-sessie (gedeelde PIN — geen audit-id).
 */
export async function getStaffUserId(): Promise<string | null> {
  const v = await getStaffCookie();
  if (v && v.startsWith("u:")) return v.slice(2);
  return null;
}

export async function setStaffCookie(
  value: "ok" | `u:${string}` = "ok"
): Promise<void> {
  const jar = await cookies();
  // Per-barista sessies krijgen een korter window (12h) zodat een laptop
  // die in een lade ligt niet eindeloos open blijft staan.
  const maxAge = value === "ok" ? ONE_DAY : TWELVE_HOURS;
  jar.set(STAFF_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export async function clearStaffCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(STAFF_COOKIE);
}

/**
 * Legacy gedeelde PIN (default 1234). Wordt gebruikt als fallback als er
 * geen per-barista accounts in de DB staan. Productie: zet STAFF_PIN of
 * gebruik /staff/users om accounts aan te maken.
 */
export function getStaffPin(): string {
  return process.env.STAFF_PIN || "1234";
}

/**
 * Vergelijk een ingetypte PIN met de geconfigureerde PIN op een
 * timing-safe manier (geen branch op het eerste fout-karakter).
 */
export function verifyLegacyPin(input: string): boolean {
  return timingSafeStringEqual(input, getStaffPin());
}
