import { NextResponse, type NextRequest } from "next/server";
import { createCustomer } from "@/lib/store";
import { setCustomerCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  let body: { name?: string; email?: string; birthday?: string };
  try {
    body = (await req.json()) as {
      name?: string;
      email?: string;
      birthday?: string;
    };
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  const birthday = (body.birthday ?? "").trim();

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
  if (birthday && !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
    return NextResponse.json(
      { error: "Ongeldige geboortedatum (verwacht YYYY-MM-DD)." },
      { status: 400 }
    );
  }
  if (birthday) {
    // Sanity-check: realistic year range, parseable date
    const parsed = new Date(birthday + "T00:00:00Z");
    const yyyy = parseInt(birthday.slice(0, 4), 10);
    if (
      isNaN(parsed.getTime()) ||
      yyyy < 1900 ||
      yyyy > new Date().getFullYear()
    ) {
      return NextResponse.json(
        { error: "Geboortedatum lijkt niet te kloppen." },
        { status: 400 }
      );
    }
  }

  const customer = await createCustomer({
    name,
    email: email || undefined,
    birthday: birthday || undefined,
  });
  await setCustomerCookie(customer.id);

  return NextResponse.json({ customer });
}
