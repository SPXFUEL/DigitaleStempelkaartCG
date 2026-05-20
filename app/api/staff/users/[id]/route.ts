import { NextResponse, type NextRequest } from "next/server";
import { deactivateStaff } from "@/lib/staff";
import { getStaffUser, listStaffUsers } from "@/lib/store";
import { isStaffAuthenticated, getStaffUserId } from "@/lib/session";
import { checkOrigin } from "@/lib/origin";
import { record as recordAudit } from "@/lib/audit";

/**
 * Deactiveer een staff-account. Alleen admins. Je kan jezelf niet de-activeren
 * en je kan niet de laatste admin uitschakelen (anders sluit je jezelf buiten).
 */
export async function DELETE(
  req: NextRequest,
  ctx: RouteContext<"/api/staff/users/[id]">
) {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const originErr = checkOrigin(req);
  if (originErr) {
    return NextResponse.json({ error: "Verboden" }, { status: 403 });
  }

  const callerId = await getStaffUserId();
  if (!callerId) {
    return NextResponse.json(
      { error: "Alleen accounts (geen legacy PIN) mogen dit" },
      { status: 403 }
    );
  }
  const caller = await getStaffUser(callerId);
  if (caller?.role !== "admin") {
    return NextResponse.json(
      { error: "Alleen admins mogen accounts beheren" },
      { status: 403 }
    );
  }

  const { id } = await ctx.params;
  if (id === callerId) {
    return NextResponse.json(
      { error: "Je kan jezelf niet uitschakelen" },
      { status: 400 }
    );
  }

  // Voorkom dat de laatste admin verdwijnt.
  const target = await getStaffUser(id);
  if (!target) {
    return NextResponse.json(
      { error: "Account niet gevonden" },
      { status: 404 }
    );
  }
  if (target.role === "admin") {
    const all = await listStaffUsers();
    const activeAdmins = all.filter(
      (u) => u.role === "admin" && !u.deactivatedAt
    );
    if (activeAdmins.length <= 1) {
      return NextResponse.json(
        { error: "Kan laatste admin niet uitschakelen" },
        { status: 400 }
      );
    }
  }

  await deactivateStaff(id);
  await recordAudit({
    action: "staff_deactivate",
    staffUserId: callerId,
    req,
    meta: { targetUserId: id },
  });

  return NextResponse.json({ ok: true });
}
