import { redirect } from "next/navigation";
import Image from "next/image";
import QRCode from "qrcode";
import Header from "@/app/components/Header";
import StampCard from "@/app/components/StampCard";
import InstallPWA from "@/app/components/InstallPWA";
import BirthdayBanner from "@/app/components/BirthdayBanner";
import StatsCard from "@/app/components/StatsCard";
import MilestoneCelebration from "@/app/components/MilestoneCelebration";
import PushToggle from "@/app/components/PushToggle";
import { getCustomerCookie } from "@/lib/session";
import { getCustomer, getCustomerEvents } from "@/lib/store";
import { STAMPS_FOR_REWARD } from "@/lib/constants";
import { computeStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export default async function ProfielPage() {
  const id = await getCustomerCookie();
  if (!id) redirect("/welkom");
  const customer = await getCustomer(id);
  if (!customer) redirect("/welkom");

  const events = await getCustomerEvents(customer.id);
  const stats = computeStats(customer, events);

  const qrPayload = `cg:cust:${customer.id}`;
  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    width: 480,
    margin: 1,
    color: { dark: "#2a1a10", light: "#ffffff" },
  });

  const remaining = Math.max(0, STAMPS_FOR_REWARD - customer.stamps);

  return (
    <div className="flex flex-col flex-1">
      <Header subtitle={`Hoi ${customer.name}`} />
      <main className="flex-1 px-5 pb-12 max-w-md w-full mx-auto space-y-5">
        <MilestoneCelebration
          customerId={customer.id}
          stamps={customer.stamps}
          rewardAvailable={customer.rewardAvailable}
          totalDrinks={customer.totalDrinks}
          totalRewards={customer.totalRewards}
          birthdayActive={customer.birthdayActive}
        />

        {customer.birthdayActive && <BirthdayBanner name={customer.name} />}

        <section className="cg-card p-6 text-center">
          <p className="text-sm" style={{ color: "var(--cg-ink-soft)" }}>
            Laat deze code aan de barista zien
          </p>
          <div
            className="mt-3 mx-auto rounded-2xl p-3 inline-block"
            style={{ background: "#fff", border: "1px solid var(--cg-line)" }}
          >
            <Image
              src={qrDataUrl}
              alt={`QR-code voor ${customer.name}`}
              width={240}
              height={240}
              unoptimized
              priority
            />
          </div>
          <p
            className="mt-3 text-xs font-mono"
            style={{ color: "var(--cg-ink-soft)" }}
          >
            ID: {customer.id.slice(0, 8)}
          </p>
        </section>

        <StampCard
          stamps={customer.stamps}
          rewardAvailable={customer.rewardAvailable}
        />

        {customer.rewardAvailable ? (
          <section
            className="cg-card p-5"
            style={{ background: "var(--cg-cream)" }}
          >
            <p
              className="text-base font-semibold"
              style={{ color: "var(--cg-coffee-dark)" }}
            >
              🎉 Je volgende drankje is gratis!
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--cg-ink-soft)" }}>
              Laat je QR aan de barista zien om in te wisselen.
            </p>
          </section>
        ) : (
          <section className="cg-card p-5">
            <p className="text-sm" style={{ color: "var(--cg-ink-soft)" }}>
              Nog{" "}
              <strong>
                {remaining} {remaining === 1 ? "stempel" : "stempels"}
              </strong>{" "}
              tot je gratis drankje.
            </p>
          </section>
        )}

        <StatsCard stats={stats} />

        <InstallPWA />

        <PushToggle />
      </main>
    </div>
  );
}
