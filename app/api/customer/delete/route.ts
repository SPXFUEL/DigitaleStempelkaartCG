import { NextResponse, type NextRequest } from "next/server";
import { deleteCustomer, getCustomer } from "@/lib/store";
import { clearCustomerCookie, getCustomerCookie } from "@/lib/session";
import { checkOrigin } from "@/lib/origin";
import { record as recordAudit } from "@/lib/audit";

/**
 * AVG art. 17 — recht op verwijdering. De klant logged-in (via cookie) kan
 * zelf z'n stempelkaart compleet wissen. CASCADE op stamp_events +
 * push_subscriptions zorgt voor de bijbehorende cleanup.
 */
export async function POST(req: NextRequest) {
  const originErr = checkOrigin(req);
  if (originErr) {
    return NextResponse.json({ error: "Verboden" }, { status: 403 });
  }

  const id = await getCustomerCookie();
  if (!id) {
    return NextResponse.json({ error: "Geen klant-sessie" }, { status: 401 });
  }
  const customer = await getCustomer(id);
  if (!customer) {
    // Cookie wijst naar niet-bestaande klant — gewoon cookie wissen.
    await clearCustomerCookie();
    return NextResponse.json({ ok: true });
  }

  await deleteCustomer(id);
  await clearCustomerCookie();
  // Log de verwijdering met geanonimiseerde meta (alleen lengte/aanwezigheid).
  await recordAudit({
    action: "customer_delete",
    customerId: id,
    req,
    meta: {
      hadEmail: Boolean(customer.email),
      hadBirthday: Boolean(customer.birthday),
      totalDrinks: customer.totalDrinks,
    },
  });

  return NextResponse.json({ ok: true });
}
