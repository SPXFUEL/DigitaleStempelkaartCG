# Coffee Garden — Digitale Stempelkaart

Een no-install web-stempelkaart voor [Coffee Garden](https://www.coffeegarden.nl) — speciaalzaak in koffie en thee.
Elk **8e drankje gratis** (koffie, thee of special) — klanten scannen één keer een QR aan de toonbank,
slaan de kaart op als web-app op hun beginscherm, en de barista zet stempels
door een eigen QR te scannen.

> **MVP-status**: werkt end-to-end met een lokale JSON-file als opslag.
> Voor productie: zwaaien naar Supabase (DB) en Apple/Google Wallet-passes.
> Zie [Roadmap](#roadmap) onderaan.

---

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19
- **Tailwind v4** voor styling
- **html5-qrcode** voor de barista-scanner
- **qrcode** voor de klant-QR (server-side gegenereerd)
- **Opslag (MVP)**: JSON-file in `/data/store.json`
- **Opslag (productie)**: vervang `lib/store.ts` door een Supabase-implementatie

## Lokaal draaien

```bash
npm install
cp .env.example .env.local   # of handmatig op Windows
npm run dev
```

Open http://localhost:3000

- `/` → herleidt naar `/welkom` (nieuwe klant) of `/profiel` (bestaande klant)
- `/welkom` → klant meldt zich aan met voornaam + optioneel e-mail
- `/profiel` → toont stempelkaart + persoonlijke QR voor de barista
- `/staff/login` → barista logt in met PIN (default `1234`, override via `STAFF_PIN`)
- `/staff` → scanner + handmatige zoekfunctie + recente klanten

## Hoe de flow werkt

1. Klant scant de QR-code die jullie aan de toonbank hangen — die wijst naar je domein
   (bv. `https://stempel.coffeegarden.nl`).
2. Onbekende telefoon → `/welkom` met aanmeldformulier + uitleg om de site
   als web-app op het beginscherm te zetten (iOS-stappen worden uitgevouwen
   uitgelegd, Android krijgt een browser-prompt).
3. Na aanmelden krijgt de klant een unieke `cg:cust:<uuid>` QR-code op `/profiel`.
4. Aan de toonbank scant de barista deze QR via `/staff` → één tap "Stempel +1".
5. Bij 7 stempels licht de kaart op met "🎉 Je volgende drankje is gratis".
   Barista tikt op "Inwisselen", kaart reset naar 0.

## Belangrijke design-keuzes

| Keuze | Waarom |
|---|---|
| Geen native app | App-store-friction is een dealbreaker voor een stempelkaart. PWA + Wallet doen het beter. |
| Voornaam-only registratie (e-mail optioneel) | Lage AVG-impact, hoge conversie. |
| Cookie-based klant-identiteit | Geen wachtwoorden, één-tap-toegang vanaf het beginscherm. |
| QR-payload `cg:cust:<uuid>` | Onleesbaar voor generieke scanners — alleen jullie eigen `/staff`-scanner kan 'm verzilveren. |
| JSON-file opslag (MVP) | Werkt zonder externe services. Vervang door Supabase voor productie (alle store-functies zijn al async + zelfde interface). |

## Belangrijke bestanden

```
app/
  layout.tsx                 root layout + PWA-meta
  page.tsx                   redirect-router (cookie-based)
  welkom/page.tsx            onboarding + aanmelden
  profiel/page.tsx           klantprofiel + persoonlijke QR
  staff/login/page.tsx       PIN-entry
  staff/page.tsx             barista-dashboard
  api/
    enroll/route.ts          POST — klant aanmaken + cookie zetten
    stamp/route.ts           POST — stempel +1 (staff-auth vereist)
    redeem/route.ts          POST — gratis drankje inwisselen
    staff/login/route.ts     POST — PIN-check, set staff-cookie
    staff/logout/route.ts    POST — clear cookie
    staff/customer/[id]/route.ts  GET — klant-lookup voor staff
    wallet/apple/[id]/route.ts    GET — Apple Wallet pass (stub)
    wallet/google/[id]/route.ts   GET — Google Wallet save URL (stub)
  components/
    Header.tsx, StampCard.tsx, EnrollForm.tsx,
    InstallPWA.tsx, StaffDashboard.tsx, StaffLoginForm.tsx,
    SWRegister.tsx
lib/
  constants.ts               STAMPS_FOR_REWARD = 7, brand
  types.ts                   Customer, StampEvent
  store.ts                   JSON-file gebaseerde store (swap voor Supabase)
  session.ts                 cookie helpers (klant + staff)
public/
  manifest.webmanifest       PWA-manifest
  icons/logo.png             source logo (2000x2000, ~2MB) — bron voor de iconen
  icons/logo-192.png         PWA-icoon 192x192 (~10KB)
  icons/logo-512.png         PWA-icoon 512x512 + maskable (~58KB)
  icons/logo-apple.png       Apple touch icon 180x180 (~9KB)
  sw.js                      service worker
scripts/
  gen-icons.mjs              herresize logo.png naar de drie PNG-formaten (npm run gen-icons)
```

## Productie-checklist

Voor je dit in een echte coffee shop gebruikt:

- [ ] **Staff-PIN** vervangen via `STAFF_PIN=...` in `.env.local`
- [ ] **HTTPS** — vereist voor camera-API én voor PWA-installatie
- [ ] **Apple/Google Wallet** integratie afmaken (zie roadmap)
- [ ] **Database** — JSON-file werkt niet op serverless (Vercel/Netlify wissen `/data` per deploy en runs zijn ephemeral). Implementeer Supabase:
  - tabel `customers (id uuid, name text, email text, stamps int, total_drinks int, total_rewards int, reward_available bool, created_at timestamptz, updated_at timestamptz)`
  - tabel `stamp_events (id bigint, customer_id uuid, type text, at timestamptz)`
  - Service-role-key voor server-side schrijven, RLS aan
- [x] **Icons** — Coffee Garden logo is geïntegreerd. Bij logo-wijziging: vervang
  `public/icons/logo.png` en run `npm run gen-icons` om de 192/512/apple varianten te herresizen.
- [ ] **QR-code aan de toonbank** — laat een sticker/A6-kaartje drukken met een QR die naar je root-URL wijst.
- [ ] **Privacy-statement** — voeg een `/privacy` pagina toe die uitlegt welke
  data jullie opslaan (voornaam, optioneel e-mail, stempel-geschiedenis).

## Roadmap

### Fase 1 — MVP (✓ klaar)
- Aanmelden, stempel zetten, inwisselen, PWA-installeerbaar

### Fase 2 — Wallet-passes
- Apple Wallet (`.pkpass` met cert-signing) — vereist Apple Developer-account (€99/jr)
- Google Wallet (JWT-save-URL) — gratis, Google Cloud + service account

### Fase 3 — Supabase migratie
- Tabellen migreren, `lib/store.ts` vervangen met Supabase-implementatie
- E-mail magic-link login zodat klant op meerdere apparaten kan inloggen

### Fase 4 — Nice-to-haves
- Push-notificaties ("Je hebt 5 stempels — nog 2 voor gratis drankje!")
- Verwijzingen ("Nodig een vriend uit, krijg samen een stempel")
- Inzichten-dashboard voor jullie (drukke uren, retentie, …)

## Vragen?

Open een issue in deze repo, of mail [ricardovanrijn2@gmail.com](mailto:ricardovanrijn2@gmail.com).
