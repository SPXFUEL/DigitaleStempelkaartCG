import { NextResponse, type NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/wallet/apple/[id]">
) {
  const { id } = await ctx.params;
  return NextResponse.json(
    {
      error: "Apple Wallet nog niet geconfigureerd",
      hint:
        "Voeg in .env.local toe: APPLE_PASS_TYPE_ID, APPLE_TEAM_ID, APPLE_WWDR_CERT, APPLE_PASS_CERT, APPLE_PASS_KEY. Zie README.",
      customerId: id,
    },
    { status: 501 }
  );
}
