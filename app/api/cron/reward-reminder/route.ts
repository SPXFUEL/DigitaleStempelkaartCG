import { NextResponse, type NextRequest } from "next/server";
import { listCustomersWithRewardAvailable } from "@/lib/store";
import { sendPushToCustomer } from "@/lib/push";

const HOUR_MS = 60 * 60 * 1000;

/**
 * Vercel cron — dagelijks 10:00 UTC (= 11:00 NL winter / 12:00 NL zomer).
 * Stuurt een herinnering naar klanten wiens reward 3-4 dagen klaarstaat
 * (24h window). Voorkomt spam: alleen exact rond dag 3 wordt 'n push gestuurd.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const upperBound = now - 72 * HOUR_MS; // 3 dagen geleden
  const lowerBound = now - 96 * HOUR_MS; // 4 dagen geleden

  const customers = await listCustomersWithRewardAvailable();
  const eligible = customers.filter((c) => {
    const ts = new Date(c.updatedAt).getTime();
    return ts >= lowerBound && ts <= upperBound;
  });

  const results = await Promise.allSettled(
    eligible.map(async (c) => {
      const r = await sendPushToCustomer(c.id, {
        title: "Je gratis koffie staat klaar ☕",
        body: `${c.name}, je hebt 7 stempels — kom je gratis drankje halen bij Coffee Garden.`,
        tag: "reward-reminder",
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
    candidates: eligible.length,
    delivered,
  });
}
