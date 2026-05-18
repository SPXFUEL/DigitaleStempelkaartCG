import { NextResponse, type NextRequest } from "next/server";
import { savePushSubscription, getCustomer } from "@/lib/store";
import { getCustomerCookie } from "@/lib/session";

interface SubscribeBody {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
  userAgent?: string;
}

export async function POST(req: NextRequest) {
  const customerId = await getCustomerCookie();
  if (!customerId) {
    return NextResponse.json(
      { error: "Geen klant-sessie" },
      { status: 401 }
    );
  }
  const customer = await getCustomer(customerId);
  if (!customer) {
    return NextResponse.json({ error: "Klant niet gevonden" }, { status: 404 });
  }

  let body: SubscribeBody;
  try {
    body = (await req.json()) as SubscribeBody;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const endpoint = body.endpoint?.trim();
  const p256dh = body.keys?.p256dh?.trim();
  const auth = body.keys?.auth?.trim();

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { error: "endpoint + keys.p256dh + keys.auth zijn vereist" },
      { status: 400 }
    );
  }

  await savePushSubscription({
    customerId,
    endpoint,
    p256dh,
    auth,
    userAgent: body.userAgent,
    failureCount: 0,
  });

  return NextResponse.json({ ok: true });
}
