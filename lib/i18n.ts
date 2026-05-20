/**
 * Minimale i18n scaffold. Alle user-facing strings zitten in `dictionaries`
 * onder een key. Default-locale is `nl`. Voeg een nieuwe taal toe door een
 * nieuw object met dezelfde keys mee te geven.
 *
 * **Bewust geen externe lib**: next-intl en i18next zijn krachtiger maar
 * brengen ~30kB bundle + config overhead mee. Voor een loyalty-app met
 * twee talen is een Record genoeg.
 *
 * Voor server-side rendering lezen we de gewenste locale uit een cookie
 * (`cg_locale`) die de gebruiker via de LangSwitcher kan zetten.
 */

import { cookies } from "next/headers";

export type Locale = "nl" | "en";
export const SUPPORTED_LOCALES: Locale[] = ["nl", "en"];
export const DEFAULT_LOCALE: Locale = "nl";
const LOCALE_COOKIE = "cg_locale";

type Dict = Record<string, string>;

/** NL is de hoofd-taal en bevat álle keys. */
const nl: Dict = {
  // Generieke acties
  "common.save": "Opslaan",
  "common.cancel": "Annuleren",
  "common.delete": "Verwijderen",
  "common.busy": "Bezig…",
  "common.close": "Sluit",
  "common.back": "Terug",

  // Welkomstpagina
  "welcome.title": "Welkom bij Coffee Garden",
  "welcome.subtitle":
    "Spaar bij elk drankje een stempel — koffie, thee of een special.",
  "welcome.cta": "Stempelkaart aanmaken",
  "welcome.have_card": "Je hebt al een stempelkaart op deze telefoon.",
  "welcome.open_card": "Open mijn stempelkaart",
  "welcome.referral_credited":
    "Je bent uitgenodigd door {name} — jullie krijgen samen een stempel-bonus zodra je je eerste drankje haalt.",

  // Profielpagina
  "profile.show_qr": "Laat deze code aan de barista zien",
  "profile.rotating_hint": "Code roteert elke 10s — altijd vers.",
  "profile.reward_ready": "🎉 Je volgende drankje is gratis!",
  "profile.reward_ready_sub":
    "Laat je QR aan de barista zien om in te wisselen.",
  "profile.history_title": "Recente bezoeken",
  "profile.history_empty":
    "Nog geen bezoeken — kom langs voor je eerste stempel!",
  "profile.delete_card": "Verwijder mijn kaart",
  "profile.delete_confirm":
    "Weet je het zeker? Je stempels en geschiedenis worden definitief gewist.",

  // Privacy
  "privacy.title": "Privacy",
  "privacy.contact": "Vragen of een verzoek tot inzage / verwijdering?",

  // Push
  "push.title": "Notificaties",
  "push.subtitle":
    "We sturen je een seintje bij een volle kaart of op je verjaardag. Niet vaker dan dat — geen spam.",
  "push.enable": "Notificaties aanzetten",
  "push.test": "Stuur test",
  "push.disable": "Uitzetten",
};

/** EN is een vertaling. Mist key → fallback naar NL. */
const en: Dict = {
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.busy": "Working…",
  "common.close": "Close",
  "common.back": "Back",
  "welcome.title": "Welcome to Coffee Garden",
  "welcome.subtitle":
    "Earn a stamp for every drink — coffee, tea or a special.",
  "welcome.cta": "Create stamp card",
  "welcome.have_card": "You already have a stamp card on this phone.",
  "welcome.open_card": "Open my card",
  "welcome.referral_credited":
    "You were invited by {name} — you'll both get a bonus stamp on your first drink.",
  "profile.show_qr": "Show this code to the barista",
  "profile.rotating_hint": "Code rotates every 10s — always fresh.",
  "profile.reward_ready": "🎉 Your next drink is on us!",
  "profile.reward_ready_sub": "Show your QR to the barista to redeem.",
  "profile.history_title": "Recent visits",
  "profile.history_empty": "No visits yet — drop in for your first stamp!",
  "profile.delete_card": "Delete my card",
  "profile.delete_confirm":
    "Are you sure? Your stamps and history will be permanently erased.",
  "privacy.title": "Privacy",
  "privacy.contact": "Questions or a request to access / delete your data?",
  "push.title": "Notifications",
  "push.subtitle":
    "We'll ping you when your card is full or on your birthday. Never more than that — no spam.",
  "push.enable": "Enable notifications",
  "push.test": "Send test",
  "push.disable": "Disable",
};

const dictionaries: Record<Locale, Dict> = { nl, en };

export function t(
  key: string,
  locale: Locale,
  params?: Record<string, string>
): string {
  const dict = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
  let str = dict[key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), v);
    }
  }
  return str;
}

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  const v = jar.get(LOCALE_COOKIE)?.value;
  if (v && (SUPPORTED_LOCALES as string[]).includes(v)) return v as Locale;
  return DEFAULT_LOCALE;
}

export async function setLocale(locale: Locale): Promise<void> {
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
