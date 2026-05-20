import { NextResponse, type NextRequest } from "next/server";
import { isStaffAuthenticated, getStaffUserId } from "@/lib/session";
import { createStaff, listStaff } from "@/lib/staff";
import { getStaffUser } from "@/lib/store";
import { checkOrigin } from "@/lib/origin";
import { record as recordAudit } from "@/lib/audit";

/**
 * Lijst van staff-accounts (alleen voor admins). Eerste-keer bootstrap:
 * legacy-PIN gebruikers (geen u:-cookie) mogen ALLEEN als de DB nog leeg is.
 */
export async function GET() {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const list = await listStaff();
  // Verwijder pinHash voordat we de lijst terug sturen — een admin mag
  // 't aantal accounts/rollen weten, maar nooit een hash uitlezen.
  const sanitized = list.map((u) => ({
    id: u.id,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
    deactivatedAt: u.deactivatedAt,
  }));
  return NextResponse.json({ users: sanitized });
}

interface CreateBody {
  name?: string;
  role?: "barista" | "admin";
  pin?: string;
}

export async function POST(req: NextRequest) {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const originErr = checkOrigin(req);
  if (originErr) {
    return NextResponse.json({ error: "Verboden" }, { status: 403 });
  }

  // Authorization: óf admin, óf eerste-account-bootstrap.
  const existing = await listStaff();
  const callerId = await getStaffUserId();
  const isBootstrap = existing.length === 0; // legacy PIN mag de eerste admin maken
  let callerIsAdmin = false;
  if (callerId) {
    const caller = await getStaffUser(callerId);
    callerIsAdmin = caller?.role === "admin";
  }
  if (!isBootstrap && !callerIsAdmin) {
    return NextResponse.json(
      { error: "Alleen admins kunnen accounts beheren" },
      { status: 403 }
    );
  }

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const role: "barista" | "admin" = body.role === "admin" ? "admin" : "barista";
  const pin = (body.pin ?? "").trim();

  try {
    // Forceer dat de eerste account een admin is.
    const finalRole = isBootstrap ? "admin" : role;
    const user = await createStaff({ name, role: finalRole, pin });
    await recordAudit({
      action: "staff_create",
      staffUserId: callerId,
      req,
      meta: { newUserId: user.id, role: finalRole, bootstrap: isBootstrap },
    });
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
