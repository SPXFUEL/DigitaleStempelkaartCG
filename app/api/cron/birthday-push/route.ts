import { NextResponse, type NextRequest } from "next/server";
import { listCustomersWithBirthday } from "@/lib/store";
import { sendPushToCustomer } from "@/lib/push";

/**
 * Vercel cron — dagelijks 07:00 UTC (= 08:00 NL winter / 09:00 NL zomer).
 * Stuurt een push naar elke klant die vandaag jarig is én de tractatie
 * dit jaar nog niet heeft ingewisseld.
 */
export async function GET(req: NextRequest) {
  // Vercel Cron stuurt: Authorization: Bearer ${CRON_SECRET}
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customers = await listCustomersWithBirthday();
  const todays = customers.filter((c) => c.birthdayActive);

  const results = await Promise.allSettled(
    todays.map(async (c) => {
      const r = await sendPushToCustomer(c.id, {
        title: `🎂 Gefeliciteerd, ${c.name}!`,
        body: "Je krijgt vandaag een gratis drankje bij Coffee Garden. Tot snel!",
        tag: "birthday",
        url: "/profiel",
      });
      return { customerId: c.id, ...r };
    })
  );

  const delivered = results.reduce(
    (sum, r) => sum + (r.status === "fulfilled" ? r.value.delivered : 0),
    0
  );

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    candidates: todays.length,
    delivered,
  });
}
