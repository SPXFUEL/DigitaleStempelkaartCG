import { NextResponse, type NextRequest } from "next/server";
import { getStaffPin, setStaffCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  let body: { pin?: string };
  try {
    body = (await req.json()) as { pin?: string };
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const pin = (body.pin ?? "").trim();
  if (pin !== getStaffPin()) {
    return NextResponse.json({ error: "Onjuiste PIN" }, { status: 401 });
  }

  await setStaffCookie();
  return NextResponse.json({ ok: true });
}
