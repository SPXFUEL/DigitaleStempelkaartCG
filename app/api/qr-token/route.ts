import { NextResponse } from "next/server";
import { getCustomerCookie } from "@/lib/session";
import { getCustomer } from "@/lib/store";
import { signQrToken } from "@/lib/hmac";
import { config } from "@/lib/config";

/**
 * Genereert een vers QR-token voor de ingelogde klant.
 * De klant-app polled dit endpoint elke ~10s zodat de QR roteert; de
 * scanner accepteert tokens binnen config.qrTokenTtlSec.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const id = await getCustomerCookie();
  if (!id) {
    return NextResponse.json({ error: "Geen klant-sessie" }, { status: 401 });
  }
  const customer = await getCustomer(id);
  if (!customer) {
    return NextResponse.json({ error: "Klant niet gevonden" }, { status: 404 });
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const token = signQrToken(customer.id, nowSec);

  return NextResponse.json(
    {
      token,
      ttlSec: config.qrTokenTtlSec,
      issuedAt: nowSec,
      expiresAt: nowSec + config.qrTokenTtlSec,
    },
    {
      headers: {
        // Voorkom dat een tussenliggende CDN een token cached + replayed.
        "cache-control": "no-store, max-age=0",
      },
    }
  );
}
