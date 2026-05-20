import { NextResponse, type NextRequest } from "next/server";
import { sendPushToCustomer } from "@/lib/push";
import { getCustomerCookie } from "@/lib/session";
import { checkOrigin } from "@/lib/origin";

/**
 * Test endpoint — stuurt een test-push naar de ingelogde klant.
 * Handig vanaf /profiel om te checken dat permissies + subscription werken.
 */
export async function POST(req: NextRequest) {
  const originErr = checkOrigin(req);
  if (originErr) {
    return NextResponse.json({ error: "Verboden" }, { status: 403 });
  }

  const customerId = await getCustomerCookie();
  if (!customerId) {
    return NextResponse.json({ error: "Geen klant-sessie" }, { status: 401 });
  }

  const result = await sendPushToCustomer(customerId, {
    title: "Coffee Garden ☕",
    body: "Notificaties werken! Je hoort van ons als er stempels of tractaties klaar staan.",
    tag: "test",
    url: "/profiel",
  });

  return NextResponse.json(result);
}
