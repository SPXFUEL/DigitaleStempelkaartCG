import Link from "next/link";
import Header from "@/app/components/Header";
import EnrollForm from "@/app/components/EnrollForm";
import InstallPWA from "@/app/components/InstallPWA";
import { getCustomerCookie } from "@/lib/session";
import { getCustomer } from "@/lib/store";
import { STAMPS_FOR_REWARD, BRAND_NAME } from "@/lib/constants";

export default async function WelkomPage() {
  const id = await getCustomerCookie();
  const existing = id ? await getCustomer(id) : null;

  return (
    <div className="flex flex-col flex-1">
      <Header subtitle="Digitale stempelkaart" />
      <main className="flex-1 px-5 pb-12 max-w-md w-full mx-auto space-y-5">
        <section className="cg-card p-6">
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: "var(--cg-coffee-dark)" }}
          >
            Welkom bij {BRAND_NAME}
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--cg-ink-soft)" }}>
            Spaar bij elke koffie een stempel. Bij <strong>{STAMPS_FOR_REWARD} stempels</strong>
            {" "}is je <strong>volgende koffie gratis</strong>.
          </p>
          <ul
            className="mt-4 space-y-2 text-sm"
            style={{ color: "var(--cg-ink)" }}
          >
            <li className="flex items-start gap-2">
              <span aria-hidden>☕</span>
              <span>Geen app-store, geen pasje — gewoon in je browser.</span>
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden>🔒</span>
              <span>Alleen je voornaam, optioneel je e-mail.</span>
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden>📱</span>
              <span>Zet 'm op je beginscherm voor 1-tik toegang.</span>
            </li>
          </ul>
        </section>

        {existing ? (
          <section className="cg-card p-6 space-y-3">
            <p className="text-sm" style={{ color: "var(--cg-ink-soft)" }}>
              Je hebt al een stempelkaart op deze telefoon.
            </p>
            <Link
              href="/profiel"
              className="cg-btn-primary inline-flex justify-center w-full"
            >
              Open mijn stempelkaart
            </Link>
          </section>
        ) : (
          <section className="cg-card p-6">
            <h2
              className="text-lg font-semibold mb-3"
              style={{ color: "var(--cg-coffee-dark)" }}
            >
              Aanmelden
            </h2>
            <EnrollForm />
          </section>
        )}

        <InstallPWA />
      </main>
    </div>
  );
}
