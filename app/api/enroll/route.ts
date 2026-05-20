import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { createCustomer, createEmailToken, getCustomer } from "@/lib/store";
import { setCustomerCookie } from "@/lib/session";
import { checkOrigin } from "@/lib/origin";
import { sendMail, verifyEmailTemplate } from "@/lib/email";
import { record as recordAudit } from "@/lib/audit";
import { config } from "@/lib/config";

const UUID_RE =
  /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TWENTY_FOUR_HOURS_SEC = 24 * 60 * 60;

export async function POST(req: NextRequest) {
  const originErr = checkOrigin(req);
  if (originErr) {
    return NextResponse.json({ error: "Verboden" }, { status: 403 });
  }

  let body: {
    name?: string;
    email?: string;
    birthday?: string;
    referredBy?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  const birthday = (body.birthday ?? "").trim();
  const referredByRaw = (body.referredBy ?? "").trim();

  if (name.length < 2) {
    return NextResponse.json(
      { error: "Vul je naam in (minimaal 2 letters)." },
      { status: 400 }
    );
  }
  if (name.length > 80) {
    return NextResponse.json(
      { error: "Naam is te lang (max 80 karakters)." },
      { status: 400 }
    );
  }
  if (email && !EMAIL_RE.test(email)) {
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

  // Valideer referral: moet een bestaande klant zijn.
  let referredBy: string | undefined;
  if (referredByRaw && UUID_RE.test(referredByRaw)) {
    const inviter = await getCustomer(referredByRaw);
    if (inviter) referredBy = inviter.id;
  }

  const customer = await createCustomer({
    name,
    email: email || undefined,
    birthday: birthday || undefined,
    referredBy,
    emailVerified: false,
  });
  await setCustomerCookie(customer.id);

  // Verstuur verificatie-mail als er een e-mail is.
  if (email) {
    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(
      Date.now() + TWENTY_FOUR_HOURS_SEC * 1000
    ).toISOString();
    await createEmailToken({
      token,
      customerId: customer.id,
      email,
      expiresAt,
    });
    const verifyUrl = `${config.baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
    const tpl = verifyEmailTemplate({ name: customer.name, verifyUrl });
    // Best-effort — als de mail-provider faalt, melden we 't in audit
    // maar laten enrollment slagen.
    void sendMail({ to: email, ...tpl }).then((r) => {
      if (!r.ok) console.warn("[enroll] mail send failed:", r.error);
    });
  }

  await recordAudit({
    action: "customer_create",
    customerId: customer.id,
    req,
    meta: {
      hasEmail: Boolean(email),
      hasBirthday: Boolean(birthday),
      referredBy: referredBy ?? null,
      welcomeBonus: config.welcomeBonus,
    },
  });

  return NextResponse.json({ customer });
}
