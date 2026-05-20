import { NextResponse, type NextRequest } from "next/server";
import { undoLastStamp, getCustomer } from "@/lib/store";
import { isStaffAuthenticated, getStaffUserId } from "@/lib/session";
import { checkOrigin } from "@/lib/origin";
import { config } from "@/lib/config";
import { record as recordAudit } from "@/lib/audit";

/**
 * Draait de laatst toegevoegde stempel van een klant terug, mits binnen
 * `UNDO_WINDOW_SEC` (default 60s). Voor typo's en dubbele taps.
 */
export async function POST(req: NextRequest) {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json(
      { error: "Niet ingelogd als barista" },
      { status: 401 }
    );
  }

  const originErr = checkOrigin(req);
  if (originErr) {
    return NextResponse.json({ error: "Verboden" }, { status: 403 });
  }

  let body: { customerId?: string };
  try {
    body = (await req.json()) as { customerId?: string };
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const id = (body.customerId ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "customerId vereist" }, { status: 400 });
  }

  const existing = await getCustomer(id);
  if (!existing) {
    return NextResponse.json({ error: "Klant niet gevonden" }, { status: 404 });
  }

  const staffUserId = await getStaffUserId();

  try {
    const customer = await undoLastStamp(id, config.undoWindowSec);
    await recordAudit({
      action: "stamp_undo",
      customerId: id,
      staffUserId,
      req,
    });
    return NextResponse.json({ customer });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
