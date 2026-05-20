# Coffee Garden — Digitale Stempelkaart

Een no-install web-stempelkaart voor [Coffee Garden](https://www.coffeegarden.nl) — speciaalzaak in koffie en thee.
Elk **8e drankje gratis** (koffie, thee of special) — klanten scannen één keer een QR aan de toonbank,
slaan de kaart op als web-app op hun beginscherm, en de barista zet stempels door een eigen QR te scannen.

---

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19
- **Tailwind v4** voor styling
- **html5-qrcode** voor de barista-scanner
- **qrcode** voor de klant-QR (server-side gegenereerd, HMAC-roterend)
- **Opslag**: Supabase Postgres (productie) of een JSON-file (dev) — runtime-keuze via env-vars
- **Push**: VAPID web-push, native browser-API
- **E-mail**: Resend (optioneel) — verificatie + transactional
- **Analytics**: Plausible (optioneel) — cookieloos, AVG-vriendelijk
- **Tests**: Vitest (unit) + Playwright (e2e)
- **CI**: GitHub Actions (lint + typecheck + test + build)

## Lokaal draaien

```bash
npm install
cp .env.example .env.local
# vul QR_SIGNING_SECRET in (verplicht):
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm run dev
```

Open http://localhost:3000

- `/` → herleidt naar `/welkom` (nieuwe klant) of `/profiel` (bestaande klant)
- `/welkom` → klant meldt zich aan met voornaam + optioneel e-mail / verjaardag
- `/welkom?ref=<uuid>` → uitnodig-link, beiden krijgen bonus-stempel bij eerste betaalde drankje
- `/profiel` → toont stempelkaart + **roterende** persoonlijke QR (HMAC, 10s rotation)
- `/privacy` → publieke privacy-pagina (AVG)
- `/verify-email?token=…` → e-mail-bevestigingslink-handler
- `/staff/login` → barista logt in met PIN (per-barista accounts of legacy gedeelde PIN)
- `/staff` → scanner + handmatige zoekfunctie + recente klanten + undo-knop + offline-queue
- `/staff/inzicht` → KPI-dashboard
- `/staff/inzicht/audit` → audit-log (laatste 200 acties)
- `/staff/users` → barista-accounts beheren (admin-only; eerste account = automatisch admin)

## Hoe de flow werkt

1. Klant scant de QR aan de toonbank → die wijst naar je domein
   (bv. `https://stempel.coffeegarden.nl`), met optionele `?ref=<uuid>` als 'm via een vriend kwam.
2. Onbekende telefoon → `/welkom` met aanmeldformulier + uitleg om de site
   als web-app op het beginscherm te zetten.
3. Na aanmelden krijgt de klant een unieke, **roterende** QR op `/profiel`. De QR
   verandert elke 10s — een screenshot is dus al verlopen voordat 'ie kan worden misbruikt.
4. Aan de toonbank scant de barista deze QR via `/staff` → één tap "Stempel +1".
5. Bij `STAMPS_FOR_REWARD` stempels licht de kaart op met "🎉 Je volgende drankje is gratis".
6. Barista tikt op "Inwisselen", kaart reset naar 0.
7. Vergissing? Binnen 60s kan barista "Onlangse stempel terugdraaien" tappen.

## Belangrijke design-keuzes

| Keuze                                                | Waarom                                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Geen native app                                      | App-store-friction is een dealbreaker voor een stempelkaart. PWA + Wallet doen het beter.                    |
| Voornaam-only registratie (e-mail optioneel)         | Lage AVG-impact, hoge conversie.                                                                             |
| Cookie-based klant-identiteit                        | Geen wachtwoorden, één-tap-toegang vanaf het beginscherm.                                                    |
| **Roterende HMAC-QR** (`cg2:<uuid>:<ts>:<sig>`)      | Screenshots zijn binnen 60s waardeloos. Backwards-compatible met `cg:cust:<uuid>` voor bestaande klanten.    |
| **Per-barista accounts + audit-log**                 | Weet wie welke stempel zette. Legacy gedeelde PIN blijft werken zolang er 0 accounts zijn.                   |
| **Login rate-limit (5 fails / 5 min)**               | Brute-force op een 4-cijfer PIN is anders triviaal.                                                          |
| **Origin-check (CSRF)**                              | SameSite=Lax + Origin = belt + suspenders.                                                                   |
| **Stamp-idempotency (30s cooldown)**                 | Dubbele tap geeft geen 2 stempels.                                                                           |
| **Welkomstbonus + referral**                         | Eerste stempel gratis bij aanmelden; uitnodiger krijgt bonus zodra vriend z'n eerste betaalde drankje haalt. |
| **Bewaartermijn (365 dagen inactief → auto-delete)** | AVG: niet onnodig opslaan.                                                                                   |
| **Self-service data-delete**                         | AVG art. 17. Knop op `/profiel`.                                                                             |

## Beveiliging — quick reference

| Endpoint                            | Origin-check | Auth                 | Rate-limit                   | Audit                                |
| ----------------------------------- | ------------ | -------------------- | ---------------------------- | ------------------------------------ |
| `POST /api/enroll`                  | ✓            | none                 | nee                          | `customer_create`                    |
| `POST /api/stamp`                   | ✓            | staff                | 30s/customer                 | `stamp`                              |
| `POST /api/stamp/undo`              | ✓            | staff                | nee                          | `stamp_undo`                         |
| `POST /api/redeem`                  | ✓            | staff                | nee                          | `redeem`                             |
| `POST /api/redeem-birthday`         | ✓            | staff                | nee                          | `redeem_birthday`                    |
| `POST /api/staff/login`             | ✓            | none                 | 5 fails/5 min, lockout 5 min | `staff_login` / `staff_login_failed` |
| `POST /api/staff/logout`            | ✓            | staff                | nee                          | —                                    |
| `POST /api/staff/users`             | ✓            | admin (of bootstrap) | nee                          | `staff_create`                       |
| `DELETE /api/staff/users/[id]`      | ✓            | admin                | nee                          | `staff_deactivate`                   |
| `POST /api/customer/delete`         | ✓            | customer             | nee                          | `customer_delete`                    |
| `POST /api/customer/request-verify` | ✓            | customer             | 1/60s                        | —                                    |
| `GET /api/customer/verify-email`    | —            | none (token-auth)    | nee                          | —                                    |
| `GET /api/qr-token`                 | —            | customer             | nee (no-store cache)         | —                                    |

## Productie-checklist

Voor je dit in een echte coffee shop gebruikt:

- [ ] **`QR_SIGNING_SECRET`** zetten (verplicht — `openssl rand -hex 32`)
- [ ] **`STAFF_PIN`** vervangen via `.env.local` + zo snel mogelijk per-barista accounts aanmaken via `/staff/users`
- [ ] **`TRUSTED_ORIGINS`** zetten op je productie-host (Origin-check)
- [ ] **HTTPS** — vereist voor camera-API, PWA-installatie, wake-lock, push
- [ ] **Database** — Run alle 4 migraties in Supabase (in volgorde)
- [ ] **Cron-secret** — `CRON_SECRET` voor de drie crons (birthday, reward-reminder, cleanup)
- [ ] **VAPID** — `npm run gen-vapid` en zet de keys in env
- [ ] **`NEXT_PUBLIC_BASE_URL`** — voor e-mail links + OG meta
- [ ] **Resend** (optioneel) — `RESEND_API_KEY` als je verificatie-mails wil
- [ ] **OG-image** — `npm run gen-og`
- [ ] **Toonbank-QR** — `BASE_URL=https://… npm run gen-poster` → print op A6
- [ ] **Plausible** (optioneel) — analytics zonder cookies
- [ ] **Apple/Google Wallet** — Google = gratis (`GOOGLE_WALLET_ISSUER_ID` + service-account JSON); Apple = €99/jaar

## Tests

```bash
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm run test        # Vitest unit tests
npm run e2e         # Playwright e2e (start dev-server automatisch)
```

CI draait alles op elke PR via `.github/workflows/ci.yml`.

## Roadmap

### ✓ Fase 1 — MVP

Aanmelden, stempel zetten, inwisselen, PWA-installeerbaar

### ✓ Fase 2 — Productionalisering (deze release)

- HMAC-roterende QR + Origin-check + login rate-limit + stamp-idempotency
- Per-barista accounts + audit-log
- AVG: `/privacy` + self-service delete + bewaartermijn cron + e-mail double opt-in
- Welkomstbonus, referral, undo, visit-history, wake-lock
- Offline scanner-queue (IndexedDB)
- OG meta-tags + Plausible analytics
- Google Wallet (echte JWT save-URL)
- ESLint + Prettier + Vitest + Playwright + GitHub Actions + Husky

### Fase 3 — Apple Wallet

Apple-Developer-account (€99/jr) + `.pkpass` met cert-signing. Stub-route staat al klaar.

### Fase 4 — Nice-to-haves

- I18n: EN-vertaling afmaken (NL keys staan in `lib/i18n.ts`)
- Marketing-mails (opt-in)
- Dashboard-grafieken per uur (drukke uren)
- E-mail magic-link login zodat klant op meerdere apparaten kan inloggen

## Vragen?

Open een issue in deze repo, of mail [ricardovanrijn2@gmail.com](mailto:ricardovanrijn2@gmail.com).
