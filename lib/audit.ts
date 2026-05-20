/**
 * Audit-log helper. Schrijft naar `audit_log` (Supabase) of het in-memory
 * file-store equivalent. Failures worden gelogd maar niet doorgegooid —
 * audit-log mag nooit een gebruikers-actie blokkeren.
 */

import type { NextRequest } from "next/server";
import type { AuditLogEntry } from "./types";
import { appendAudit } from "./store";

export type AuditAction = AuditLogEntry["action"];

interface RecordOptions {
  action: AuditAction;
  customerId?: string | null;
  staffUserId?: string | null;
  req?: NextRequest;
  meta?: Record<string, unknown>;
}

function extractClientInfo(req?: NextRequest): {
  ip: string | null;
  userAgent: string | null;
} {
  if (!req) return { ip: null, userAgent: null };
  const fwd = req.headers.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0].trim() || req.headers.get("x-real-ip") || null;
  const userAgent = req.headers.get("user-agent");
  return { ip, userAgent };
}

export async function record(opts: RecordOptions): Promise<void> {
  const { ip, userAgent } = extractClientInfo(opts.req);
  try {
    await appendAudit({
      action: opts.action,
      customerId: opts.customerId ?? null,
      staffUserId: opts.staffUserId ?? null,
      ip,
      userAgent,
      meta: opts.meta,
      at: new Date().toISOString(),
    });
  } catch (err) {
    // Best-effort — audit failure mag de hoofdactie niet kapot maken.
    console.error("[audit] write failed:", err);
  }
}
