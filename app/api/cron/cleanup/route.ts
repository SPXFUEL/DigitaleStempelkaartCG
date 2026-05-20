import { NextResponse, type NextRequest } from "next/server";
import { deleteCustomer, listInactiveCustomers } from "@/lib/store";
import { config } from "@/lib/config";
import { record as recordAudit } from "@/lib/audit";

/**
 * Bewaartermijn cleanup. Verwijdert klanten die langer dan
 * `INACTIVE_RETENTION_DAYS` geen activiteit hebben gehad. Default 365 dagen.
 *
 * Aanroepen via Vercel cron met Authorization: Bearer ${CRON_SECRET}.
 * Schedule staat in vercel.json (eens per week is genoeg).
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (config.inactiveRetentionDays <= 0) {
    return NextResponse.json({
      ranAt: new Date().toISOString(),
      skipped: true,
      reason: "INACTIVE_RETENTION_DAYS=0",
    });
  }

  const cutoff = new Date(
    Date.now() - config.inactiveRetentionDays * 24 * 60 * 60 * 1000
  ).toISOString();

  const stale = await listInactiveCustomers(cutoff);
  let deleted = 0;
  for (const c of stale) {
    try {
      await deleteCustomer(c.id);
      await recordAudit({
        action: "customer_delete",
        customerId: c.id,
        meta: { reason: "retention_policy", lastSeenAt: c.updatedAt },
      });
      deleted++;
    } catch (err) {
      console.warn("[cleanup] failed for", c.id, err);
    }
  }

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    candidates: stale.length,
    deleted,
    cutoff,
    retentionDays: config.inactiveRetentionDays,
  });
}
