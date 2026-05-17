import { NextResponse, type NextRequest } from "next/server";
import { redeemReward, getCustomer } from "@/lib/store";
import { isStaffAuthenticated } from "@/lib/session";

export async function POST(req: NextRequest) {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json({ error: "Niet ingelogd als barista" }, { status: 401 });
  }

  let body: { customerId?: string };
  try {
    body = (await req.json()) as { customerId?: string };
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const id = (body.customerId ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "customerId vereist" }, { status: 400 });
  }

  const existing = await getCustomer(id);
  if (!existing) {
    return NextResponse.json({ error: "Klant niet gevonden" }, { status: 404 });
  }

  try {
    const customer = await redeemReward(id);
    return NextResponse.json({ customer });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
