import { NextResponse, type NextRequest } from "next/server";
import { removePushSubscription } from "@/lib/store";
import { getCustomerCookie } from "@/lib/session";
import { checkOrigin } from "@/lib/origin";

export async function POST(req: NextRequest) {
  const originErr = checkOrigin(req);
  if (originErr) {
    return NextResponse.json({ error: "Verboden" }, { status: 403 });
  }

  const customerId = await getCustomerCookie();
  if (!customerId) {
    return NextResponse.json({ error: "Geen klant-sessie" }, { status: 401 });
  }

  let body: { endpoint?: string };
  try {
    body = (await req.json()) as { endpoint?: string };
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const endpoint = body.endpoint?.trim();
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint vereist" }, { status: 400 });
  }

  await removePushSubscription(endpoint);
  return NextResponse.json({ ok: true });
}
