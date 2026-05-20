/**
 * Google Wallet loyalty pass — JWT save-URL generator.
 *
 * Vereist:
 *  - GOOGLE_WALLET_ISSUER_ID (zichtbaar in Google Pay & Wallet Console)
 *  - GOOGLE_WALLET_SERVICE_ACCOUNT_JSON (private key + client_email; ofwel als
 *    JSON-string óf als file path; we parsen beide)
 *
 * Cycle:
 *  1. We definiëren één LoyaltyClass per app ("Coffee Garden stempelkaart").
 *     De class wordt automatisch aangemaakt bij de eerste save als 'ie nog
 *     niet bestaat — we proberen 'm te POST'en en negeren 409.
 *  2. Per klant maken we een LoyaltyObject (one-time) en geven hun een
 *     JWT-save-link terug die ze in Google Wallet kunnen opslaan.
 *
 * Verdere stempel-updates: roep `pushObjectUpdate(...)` aan na elke stempel,
 * dan ziet de klant 't direct in z'n Wallet (alleen op Android).
 */

import { config } from "./config";
import { createSign } from "node:crypto";

const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID ?? "";
const SA_JSON = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON ?? "";

const CLASS_SUFFIX = "coffee_garden_stempelkaart";

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

function isConfigured(): boolean {
  return Boolean(ISSUER_ID && SA_JSON);
}

let cachedSa: ServiceAccount | null = null;
function getServiceAccount(): ServiceAccount {
  if (cachedSa) return cachedSa;
  if (!SA_JSON)
    throw new Error("GOOGLE_WALLET_SERVICE_ACCOUNT_JSON niet gezet");
  let parsed: unknown;
  try {
    parsed = JSON.parse(SA_JSON);
  } catch {
    throw new Error("GOOGLE_WALLET_SERVICE_ACCOUNT_JSON is geen geldige JSON");
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("client_email" in parsed) ||
    !("private_key" in parsed)
  ) {
    throw new Error("Service-account JSON mist client_email of private_key");
  }
  cachedSa = parsed as ServiceAccount;
  return cachedSa;
}

function classId(): string {
  return `${ISSUER_ID}.${CLASS_SUFFIX}`;
}

function objectId(customerId: string): string {
  return `${ISSUER_ID}.${customerId.replace(/-/g, "")}`;
}

function base64url(input: Buffer | string): string {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return b
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildLoyaltyObject(customerId: string, name: string, stamps: number) {
  return {
    id: objectId(customerId),
    classId: classId(),
    state: "ACTIVE",
    accountId: customerId,
    accountName: name,
    loyaltyPoints: {
      label: "Stempels",
      balance: { string: `${stamps}/${config.stampsForReward}` },
    },
    barcode: {
      type: "QR_CODE",
      value: `cg:cust:${customerId}`,
      alternateText: customerId.slice(0, 8),
    },
    heroImage: {
      sourceUri: { uri: `${config.baseUrl}/icons/logo-512.png` },
    },
    hexBackgroundColor: "#5b3a1f",
  };
}

function buildLoyaltyClass() {
  return {
    id: classId(),
    issuerName: "Coffee Garden",
    reviewStatus: "UNDER_REVIEW",
    programName: "Stempelkaart",
    programLogo: {
      sourceUri: { uri: `${config.baseUrl}/icons/logo-512.png` },
    },
    hexBackgroundColor: "#5b3a1f",
    countryCode: "NL",
    rewardsTier: "Spaar voor een gratis drankje",
    rewardsTierLabel: `${config.stampsForReward} stempels = gratis`,
  };
}

function signJwtRs256(payload: object): string {
  const sa = getServiceAccount();
  const header = { alg: "RS256", typ: "JWT", kid: sa.client_email };
  const enc = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(enc);
  signer.end();
  const sig = signer.sign(sa.private_key);
  return `${enc}.${base64url(sig)}`;
}

/**
 * Returnt een save-URL die je aan de klant kan tonen ("Voeg toe aan Google
 * Wallet"-knop). Klant tikt → Google opent → wallet-pas wordt opgeslagen.
 */
export async function generateSaveUrl(
  customerId: string,
  name: string,
  stamps: number
): Promise<{ ok: true; url: string } | { ok: false; reason: string }> {
  if (!isConfigured()) return { ok: false, reason: "not_configured" };
  try {
    const sa = getServiceAccount();
    const payload = {
      iss: sa.client_email,
      aud: "google",
      typ: "savetowallet",
      iat: Math.floor(Date.now() / 1000),
      payload: {
        loyaltyClasses: [buildLoyaltyClass()],
        loyaltyObjects: [buildLoyaltyObject(customerId, name, stamps)],
      },
    };
    const jwt = signJwtRs256(payload);
    return { ok: true, url: `https://pay.google.com/gp/v/save/${jwt}` };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "unknown",
    };
  }
}

/**
 * Update een bestaand pasje. Aanroepen na elke stempel/redeem zodat de
 * klant-app 't direct ziet (alleen op Android — iOS kent Google Wallet niet).
 *
 * Geeft true als de update geslaagd is, false anders. Failures zijn geen
 * reden om de hoofdactie te laten falen.
 */
export async function pushObjectUpdate(
  customerId: string,
  stamps: number
): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    const sa = getServiceAccount();
    // Get OAuth token (service-account JWT exchange)
    const now = Math.floor(Date.now() / 1000);
    const assertion = signJwtRs256({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/wallet_object.issuer",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    });
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    if (!tokenRes.ok) return false;
    const tok = (await tokenRes.json()) as { access_token: string };

    const res = await fetch(
      `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${objectId(customerId)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok.access_token}`,
        },
        body: JSON.stringify({
          loyaltyPoints: {
            label: "Stempels",
            balance: { string: `${stamps}/${config.stampsForReward}` },
          },
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

export const __forTests = { buildLoyaltyObject, buildLoyaltyClass };
