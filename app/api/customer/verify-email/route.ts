import { NextResponse, type NextRequest } from "next/server";
import { consumeEmailToken, setCustomerEmailVerified } from "@/lib/store";

/**
 * Consumeert een verificatie-token. GET zodat 'm uit een mail-link gewerkt
 * kan worden; geen body. Idempotent: een al-geconsumeerd token returnt 410.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  if (!token || token.length < 8) {
    return NextResponse.json({ error: "Ongeldige token" }, { status: 400 });
  }

  const consumed = await consumeEmailToken(token);
  if (!consumed) {
    return NextResponse.json(
      { error: "Token is verlopen of al gebruikt" },
      { status: 410 }
    );
  }

  await setCustomerEmailVerified(consumed.customerId, true);
  return NextResponse.json({ ok: true });
}
