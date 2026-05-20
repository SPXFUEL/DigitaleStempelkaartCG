import { NextResponse, type NextRequest } from "next/server";
import { addStamp, getCustomer, incrementReferralsCount } from "@/lib/store";
import { isStaffAuthenticated, getStaffUserId } from "@/lib/session";
import { firePushToCustomer } from "@/lib/push";
import { checkOrigin } from "@/lib/origin";
import { tryConsume } from "@/lib/rate-limit";
import { config } from "@/lib/config";
import { record as recordAudit } from "@/lib/audit";
import { pushObjectUpdate } from "@/lib/wallet-google";

export async function POST(req: NextRequest) {
  if (!(await isStaffAuthenticated())) {
    return NextResponse.json(
      { error: "Niet ingelogd als barista" },
      { status: 401 }
    );
  }

  const originErr = checkOrigin(req);
  if (originErr) {
    return NextResponse.json({ error: "Verboden" }, { status: 403 });
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

  // Idempotency: maximaal 1 stempel per klant per cooldown-window.
  // Voorkomt dat een dubbele tap of een replay binnen seconden 2 stempels geeft.
  if (!tryConsume(`stamp:${id}`, config.stampCooldownSec)) {
    return NextResponse.json(
      {
        error: `Wacht ${config.stampCooldownSec}s tussen stempels op dezelfde kaart.`,
      },
      { status: 429 }
    );
  }

  const staffUserId = await getStaffUserId();

  try {
    const customer = await addStamp(id, { staffUserId });

    // Bonus-stempel voor de uitnodiger als dit de eerste "betaalde" stempel
    // is van deze klant. Bij welkomstbonus aan = totalDrinks 1 → 2.
    const isFirstPaidStamp =
      customer.totalDrinks === (config.welcomeBonus ? 2 : 1);
    if (isFirstPaidStamp && existing.referredBy) {
      try {
        const ref = await getCustomer(existing.referredBy);
        if (ref) {
          await addStamp(ref.id, { type: "referral", staffUserId });
          await incrementReferralsCount(ref.id);
          firePushToCustomer(ref.id, {
            title: "🎉 Een vriend kwam langs!",
            body: `${customer.name} haalde z'n eerste drankje — jij krijgt een bonus-stempel.`,
            tag: "referral",
            url: "/profiel",
          });
        }
      } catch (err) {
        console.warn("[stamp] referral bonus failed:", err);
      }
    }

    if (customer.rewardAvailable) {
      firePushToCustomer(customer.id, {
        title: `🎉 Je ${config.stampsForReward}e stempel zit erop!`,
        body: `${customer.name}, je volgende drankje is gratis bij Coffee Garden.`,
        tag: "reward-unlocked",
        url: "/profiel",
      });
    }

    // Update Google Wallet pasje (best-effort, no-op als niet geconfigureerd)
    void pushObjectUpdate(customer.id, customer.stamps);

    await recordAudit({
      action: "stamp",
      customerId: id,
      staffUserId,
      req,
      meta: {
        newStamps: customer.stamps,
        rewardUnlocked: customer.rewardAvailable,
      },
    });

    return NextResponse.json({ customer });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
