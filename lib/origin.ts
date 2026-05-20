/**
 * CSRF-bescherming via Origin/Referer header-check. SameSite=Lax cookies
 * dekken de meeste browsers af, maar oude browsers / WebViews kunnen 'm
 * negeren — een expliciete Origin-check is goedkoop en sluit het gat.
 *
 * Beleid:
 *  - Op productie: Origin moet matchen met de Host header van de request,
 *    óf voorkomen in TRUSTED_ORIGINS env-var.
 *  - In dev (NODE_ENV !== "production"): permissive — anders breekt
 *    Postman / curl-testing.
 */

import type { NextRequest } from "next/server";

function parseHost(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Returnt null als alles OK is; anders een korte reden-string (voor logs).
 * Caller bepaalt zelf de status-code (meestal 403).
 */
export function checkOrigin(req: NextRequest): string | null {
  if (process.env.NODE_ENV !== "production") return null;

  const origin = parseHost(req.headers.get("origin"));
  const referer = parseHost(req.headers.get("referer"));
  const host = req.headers.get("host")?.toLowerCase() ?? "";

  const trustedRaw = process.env.TRUSTED_ORIGINS ?? "";
  const trusted = new Set(
    trustedRaw
      .split(",")
      .map((s) =>
        parseHost(
          s.trim().startsWith("http") ? s.trim() : `https://${s.trim()}`
        )
      )
      .filter((s): s is string => s !== null)
  );
  if (host) trusted.add(host);

  // Tenminste één van origin/referer moet matchen.
  if (origin && trusted.has(origin)) return null;
  if (referer && trusted.has(referer)) return null;

  // Geen Origin/Referer en geen match — verdacht.
  if (!origin && !referer) return "missing_origin_and_referer";
  return "origin_mismatch";
}
