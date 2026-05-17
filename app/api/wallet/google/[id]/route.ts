import { NextResponse, type NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/wallet/google/[id]">
) {
  const { id } = await ctx.params;
  return NextResponse.json(
    {
      error: "Google Wallet nog niet geconfigureerd",
      hint:
        "Voeg in .env.local toe: GOOGLE_WALLET_ISSUER_ID, GOOGLE_WALLET_SERVICE_ACCOUNT_JSON. Zie README.",
      customerId: id,
    },
    { status: 501 }
  );
}
