import { config } from "./config";

/**
 * Aantal stempels voor een gratis drankje. Komt uit env (STAMPS_FOR_REWARD),
 * default 7. We exporteren 'm ook als losse const zodat client-componenten 'm
 * gewoon kunnen importeren — Next.js inline't de waarde op build-time.
 */
export const STAMPS_FOR_REWARD = config.stampsForReward;

export const BRAND_NAME = "Coffee Garden";
export const BRAND_URL = "https://www.coffeegarden.nl";
export const REWARD_LABEL = "Gratis drankje";
/** Geschatte gemiddelde drankje-prijs (in €) voor de "totaal-bespaard"-stat */
export const ASSUMED_DRINK_PRICE = 4;

/** AVG / privacy contact-mailadres (wordt op /privacy getoond). */
export const PRIVACY_CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_PRIVACY_CONTACT ?? "info@coffeegarden.nl";
