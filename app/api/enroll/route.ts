import { NextResponse, type NextRequest } from "next/server";
import { createCustomer } from "@/lib/store";
import { setCustomerCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  let body: { name?: string; email?: string };
  try {
    body = (await req.json()) as { name?: string; email?: string };
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();

  if (name.length < 2) {
    return NextResponse.json(
      { error: "Vul je naam in (minimaal 2 letters)." },
      { status: 400 }
    );
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Ongeldig e-mailadres." },
      { status: 400 }
    );
  }

  const customer = await createCustomer({ name, email: email || undefined });
  await setCustomerCookie(customer.id);

  return NextResponse.json({ customer });
}
