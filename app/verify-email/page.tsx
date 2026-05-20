import Link from "next/link";
import Header from "@/app/components/Header";
import { consumeEmailToken, setCustomerEmailVerified } from "@/lib/store";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

interface SearchParams {
  token?: string;
}

/**
 * E-mail-bevestigingslink. We doen de verificatie server-side bij page-load
 * (idempotent: een al-geconsumeerd token toont gewoon "al bevestigd").
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const token = params.token ?? "";

  let state: "ok" | "expired" | "missing" = "ok";
  if (!token || token.length < 8) {
    state = "missing";
  } else {
    const consumed = await consumeEmailToken(token);
    if (!consumed) {
      state = "expired";
    } else {
      await setCustomerEmailVerified(consumed.customerId, true);
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <Header subtitle="E-mail bevestigen" />
      <main className="flex-1 px-5 pb-12 max-w-md w-full mx-auto space-y-4">
        <section className="cg-card p-6 text-center space-y-3">
          {state === "ok" && (
            <>
              <p className="text-3xl">✅</p>
              <h1
                className="text-xl font-semibold"
                style={{ color: "var(--cg-coffee-dark)" }}
              >
                Bedankt, je e-mail is bevestigd
              </h1>
              <p className="text-sm" style={{ color: "var(--cg-ink-soft)" }}>
                Je krijgt nu een seintje bij een volle kaart of op je
                verjaardag. Niet vaker dan dat — geen spam.
              </p>
            </>
          )}
          {state === "expired" && (
            <>
              <p className="text-3xl">⏰</p>
              <h1
                className="text-xl font-semibold"
                style={{ color: "var(--cg-coffee-dark)" }}
              >
                Link verlopen of al gebruikt
              </h1>
              <p className="text-sm" style={{ color: "var(--cg-ink-soft)" }}>
                Open je stempelkaart en vraag een nieuwe verificatie-mail aan.
              </p>
            </>
          )}
          {state === "missing" && (
            <>
              <p className="text-3xl">❓</p>
              <h1
                className="text-xl font-semibold"
                style={{ color: "var(--cg-coffee-dark)" }}
              >
                Geen token gevonden
              </h1>
              <p className="text-sm" style={{ color: "var(--cg-ink-soft)" }}>
                Open de link uit de mail die we je hebben gestuurd.
              </p>
            </>
          )}
          <Link
            href="/profiel"
            className="cg-btn-primary inline-flex justify-center w-full"
          >
            Naar mijn stempelkaart
          </Link>
          <p className="text-[11px]" style={{ color: "var(--cg-ink-soft)" }}>
            <a href={config.baseUrl} className="underline">
              {config.baseUrl}
            </a>
          </p>
        </section>
      </main>
    </div>
  );
}
