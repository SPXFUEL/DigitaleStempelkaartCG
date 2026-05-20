import { NextResponse, type NextRequest } from "next/server";
import { clearStaffCookie } from "@/lib/session";
import { checkOrigin } from "@/lib/origin";

export async function POST(req: NextRequest) {
  const originErr = checkOrigin(req);
  if (originErr) {
    return NextResponse.json({ error: "Verboden" }, { status: 403 });
  }
  await clearStaffCookie();
  return NextResponse.json({ ok: true });
}
