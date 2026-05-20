import Header from "@/app/components/Header";
import { BRAND_NAME, PRIVACY_CONTACT_EMAIL } from "@/lib/constants";
import { config } from "@/lib/config";

export const metadata = { title: `Privacy — ${BRAND_NAME}` };

export default function PrivacyPage() {
  return (
    <div className="flex flex-col flex-1">
      <Header subtitle="Privacy" />
      <main className="flex-1 px-5 pb-12 max-w-md w-full mx-auto space-y-4 text-sm leading-relaxed">
        <section
          className="cg-card p-6 space-y-3"
          style={{ color: "var(--cg-ink)" }}
        >
          <h1
            className="text-xl font-semibold"
            style={{ color: "var(--cg-coffee-dark)" }}
          >
            Privacy & jouw gegevens
          </h1>
          <p>
            {BRAND_NAME} gebruikt deze stempelkaart om jou loyaliteits-stempels
            te kunnen geven. Wij verwerken zo min mogelijk gegevens, en alleen
            voor dit specifieke doel.
          </p>

          <h2
            className="font-semibold pt-2"
            style={{ color: "var(--cg-coffee-dark)" }}
          >
            Wat we opslaan
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Voornaam</strong> — om je te herkennen aan de toonbank.
            </li>
            <li>
              <strong>E-mailadres</strong> (optioneel) — alleen om je een
              bevestigingslink te sturen en je een seintje te kunnen geven bij
              een volle kaart of verjaardag.
            </li>
            <li>
              <strong>Geboortedatum</strong> (optioneel) — alleen voor je
              verjaardags-tractatie. We tonen niemand je geboortejaar.
            </li>
            <li>
              <strong>Stempel-geschiedenis</strong> — wanneer en welk type
              drankje (stempel, gratis drankje, verjaardags-tractatie).
            </li>
            <li>
              <strong>Push-subscription</strong> (alleen als je notificaties
              hebt aangezet) — een technische sleutel om je telefoon te kunnen
              bereiken. Bevat geen telefoonnummer of identificatie.
            </li>
          </ul>

          <h2
            className="font-semibold pt-2"
            style={{ color: "var(--cg-coffee-dark)" }}
          >
            Wat we niet doen
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>We delen niets met derden voor advertenties.</li>
            <li>
              We gebruiken{" "}
              <strong>geen tracking-cookies of third-party analytics</strong>.
              {config.plausibleDomain
                ? " Bezoekers worden geteld via Plausible — cookie-loos en geanonimiseerd."
                : ""}
            </li>
            <li>
              We profileren je niet en sturen geen marketing-mails (alleen
              functionele berichten over je kaart).
            </li>
          </ul>

          <h2
            className="font-semibold pt-2"
            style={{ color: "var(--cg-coffee-dark)" }}
          >
            Hoe lang bewaren we het?
          </h2>
          <p>
            {config.inactiveRetentionDays > 0 ? (
              <>
                Als je {config.inactiveRetentionDays} dagen geen stempel meer
                hebt gespaard, verwijderen we je kaart automatisch.
              </>
            ) : (
              <>
                Je gegevens blijven staan tot jij ze verwijdert. We hebben geen
                automatische opschoning ingericht.
              </>
            )}{" "}
            Je kan op je profiel-pagina (knop onderaan) zelf op elk moment je
            kaart en bijbehorende data definitief verwijderen.
          </p>

          <h2
            className="font-semibold pt-2"
            style={{ color: "var(--cg-coffee-dark)" }}
          >
            Je rechten (AVG)
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Inzage:</strong> stuur ons een mail, dan zien we hoe we 't
              snelst een overzicht kunnen geven.
            </li>
            <li>
              <strong>Verwijdering:</strong> klik op &quot;Verwijder mijn
              stempelkaart&quot; op je profiel-pagina, of mail ons.
            </li>
            <li>
              <strong>Bezwaar / vragen:</strong> mail ons gerust.
            </li>
          </ul>

          <h2
            className="font-semibold pt-2"
            style={{ color: "var(--cg-coffee-dark)" }}
          >
            Verwerkers
          </h2>
          <p>
            De data wordt opgeslagen bij <strong>Supabase</strong> (Postgres, EU
            region). De web-app draait op <strong>Vercel</strong>.
            Verificatie-mails gaan via <strong>Resend</strong> (alleen als je
            een e-mailadres opgeeft). Alle drie hebben we een verwerkers-
            overeenkomst mee.
          </p>

          <h2
            className="font-semibold pt-2"
            style={{ color: "var(--cg-coffee-dark)" }}
          >
            Contact
          </h2>
          <p>
            Vragen of een verzoek tot inzage / verwijdering?{" "}
            <a
              href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
              className="underline"
              style={{ color: "var(--cg-coffee-dark)" }}
            >
              {PRIVACY_CONTACT_EMAIL}
            </a>
          </p>

          <p
            className="text-[11px] pt-3"
            style={{ color: "var(--cg-ink-soft)" }}
          >
            Laatst bijgewerkt: {new Date().toISOString().slice(0, 10)}.
          </p>
        </section>
      </main>
    </div>
  );
}
