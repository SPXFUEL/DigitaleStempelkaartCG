import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { createEmailToken, getCustomer } from "@/lib/store";
import { getCustomerCookie } from "@/lib/session";
import { checkOrigin } from "@/lib/origin";
import { sendMail, verifyEmailTemplate } from "@/lib/email";
import { tryConsume } from "@/lib/rate-limit";
import { config } from "@/lib/config";

const TWENTY_FOUR_HOURS_SEC = 24 * 60 * 60;

/**
 * Vraag een nieuwe verificatie-mail aan (bv. omdat de eerste niet aankwam,
 * of omdat de klant pas later een e-mail aan z'n account heeft toegevoegd).
 * Rate-limited op 1 per 60s per klant.
 */
export async function POST(req: NextRequest) {
  const originErr = checkOrigin(req);
  if (originErr) {
    return NextResponse.json({ error: "Verboden" }, { status: 403 });
  }

  const id = await getCustomerCookie();
  if (!id) {
    return NextResponse.json({ error: "Geen klant-sessie" }, { status: 401 });
  }
  const customer = await getCustomer(id);
  if (!customer) {
    return NextResponse.json({ error: "Klant niet gevonden" }, { status: 404 });
  }
  if (!customer.email) {
    return NextResponse.json({ error: "Geen e-mail bekend" }, { status: 400 });
  }
  if (customer.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  if (!tryConsume(`verify:${id}`, 60)) {
    return NextResponse.json(
      { error: "Wacht even — net één verstuurd." },
      { status: 429 }
    );
  }

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(
    Date.now() + TWENTY_FOUR_HOURS_SEC * 1000
  ).toISOString();
  await createEmailToken({
    token,
    customerId: id,
    email: customer.email,
    expiresAt,
  });
  const verifyUrl = `${config.baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
  const tpl = verifyEmailTemplate({ name: customer.name, verifyUrl });
  const sent = await sendMail({ to: customer.email, ...tpl });

  return NextResponse.json({ ok: sent.ok, error: sent.error });
}
