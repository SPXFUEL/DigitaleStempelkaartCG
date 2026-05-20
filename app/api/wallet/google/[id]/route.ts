import { NextResponse, type NextRequest } from "next/server";
import { getCustomer } from "@/lib/store";
import { getCustomerCookie } from "@/lib/session";
import { generateSaveUrl } from "@/lib/wallet-google";

/**
 * Genereert een Google Wallet save-URL voor de aangevraagde klant.
 * Alleen de klant zelf (cookie matcht) mag z'n eigen pas opvragen — anders
 * zou een willekeurige bezoeker pasjes voor andermans ID kunnen ophalen.
 */
export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/wallet/google/[id]">
) {
  const { id } = await ctx.params;
  const cookieId = await getCustomerCookie();
  if (!cookieId || cookieId !== id) {
    return NextResponse.json({ error: "Verboden" }, { status: 403 });
  }

  const customer = await getCustomer(id);
  if (!customer) {
    return NextResponse.json({ error: "Klant niet gevonden" }, { status: 404 });
  }

  const result = await generateSaveUrl(
    customer.id,
    customer.name,
    customer.stamps
  );
  if (!result.ok) {
    if (result.reason === "not_configured") {
      return NextResponse.json(
        {
          error: "Google Wallet nog niet geconfigureerd",
          hint: "Zet GOOGLE_WALLET_ISSUER_ID + GOOGLE_WALLET_SERVICE_ACCOUNT_JSON in env. Zie README.",
        },
        { status: 501 }
      );
    }
    return NextResponse.json({ error: result.reason }, { status: 500 });
  }

  return NextResponse.json({ url: result.url });
}
