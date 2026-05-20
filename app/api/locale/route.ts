import { NextResponse, type NextRequest } from "next/server";
import { setLocale, SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";
import { checkOrigin } from "@/lib/origin";

export async function POST(req: NextRequest) {
  const originErr = checkOrigin(req);
  if (originErr) {
    return NextResponse.json({ error: "Verboden" }, { status: 403 });
  }
  let body: { locale?: string };
  try {
    body = (await req.json()) as { locale?: string };
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }
  const loc = body.locale;
  if (!loc || !(SUPPORTED_LOCALES as readonly string[]).includes(loc)) {
    return NextResponse.json({ error: "Ongeldige locale" }, { status: 400 });
  }
  await setLocale(loc as Locale);
  return NextResponse.json({ ok: true });
}
