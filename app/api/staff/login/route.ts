import { NextResponse, type NextRequest } from "next/server";
import { setStaffCookie, verifyLegacyPin } from "@/lib/session";
import { checkOrigin } from "@/lib/origin";
import { verifyPin } from "@/lib/staff";
import { listStaffUsers } from "@/lib/store";
import {
  checkLockout,
  clientKey,
  clearFailures,
  recordFailure,
} from "@/lib/rate-limit";
import { config } from "@/lib/config";
import { record as recordAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const originErr = checkOrigin(req);
  if (originErr) {
    return NextResponse.json({ error: "Verboden" }, { status: 403 });
  }

  const key = clientKey(req.headers, "login");

  // Lockout-check VOOR we de PIN lezen — voorkom credential-stuffing.
  const lock = checkLockout(key, config.loginRateLimit, config.loginLockoutSec);
  if (!lock.allowed) {
    return NextResponse.json(
      {
        error: `Te veel pogingen. Probeer over ${lock.retryAfterSec}s opnieuw.`,
      },
      {
        status: 429,
        headers: { "retry-after": String(lock.retryAfterSec) },
      }
    );
  }

  let body: { pin?: string };
  try {
    body = (await req.json()) as { pin?: string };
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const pin = (body.pin ?? "").trim();
  if (!pin) {
    return NextResponse.json({ error: "PIN vereist" }, { status: 400 });
  }

  // Probeer eerst per-barista accounts.
  const staffResult = await verifyPin(pin);

  if (staffResult.ok && staffResult.user) {
    clearFailures(key);
    await setStaffCookie(`u:${staffResult.user.id}` as const);
    await recordAudit({
      action: "staff_login",
      staffUserId: staffResult.user.id,
      req,
      meta: { method: "per_user" },
    });
    return NextResponse.json({ ok: true });
  }

  // Fallback naar legacy gedeelde PIN — alleen als er geen accounts zijn,
  // óf als 'm matcht (voor backwards-compat met bestaande deployments).
  const noAccountsYet = staffResult.reason === "no_users";
  const legacyOk = verifyLegacyPin(pin);

  if (legacyOk && (noAccountsYet || (await listStaffUsers()).length === 0)) {
    clearFailures(key);
    await setStaffCookie("ok");
    await recordAudit({
      action: "staff_login",
      req,
      meta: { method: "legacy_pin" },
    });
    return NextResponse.json({ ok: true });
  }

  const after = recordFailure(
    key,
    config.loginRateLimit,
    config.loginLockoutSec * 2, // window is dubbel zo lang als de lockout
    config.loginLockoutSec
  );
  await recordAudit({
    action: "staff_login_failed",
    req,
    meta: { attempts: after.count },
  });

  if (!after.allowed) {
    return NextResponse.json(
      {
        error: `Te veel pogingen. Probeer over ${after.retryAfterSec}s opnieuw.`,
      },
      {
        status: 429,
        headers: { "retry-after": String(after.retryAfterSec) },
      }
    );
  }

  return NextResponse.json({ error: "Onjuiste PIN" }, { status: 401 });
}
