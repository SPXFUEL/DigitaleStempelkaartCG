/**
 * Transactional e-mail. Gebruikt Resend (https://resend.com) als
 * `RESEND_API_KEY` gezet is; valt anders terug op een console-log zodat
 * je in dev de inhoud kan zien zonder een echte mail te sturen.
 *
 * Resend is gekozen omdat: gratis tier 100 mails/dag, simpele REST API,
 * EU region beschikbaar (AVG-vriendelijk). Swap-out naar SendGrid / Postmark
 * / SES is een tekstwijziging.
 */

import { config } from "./config";

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  /** Optioneel — Resend genereert er zelf één uit `html` als je 'm leeg laat. */
  text?: string;
}

export interface SendMailResult {
  ok: boolean;
  /** Resend message-id of "console" voor de log-fallback. */
  id?: string;
  error?: string;
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  if (!config.resendApiKey) {
    console.log(
      `[email] (no RESEND_API_KEY) to=${input.to} subject="${input.subject}"\n--- HTML ---\n${input.html}\n---`
    );
    return { ok: true, id: "console" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.resendApiKey}`,
      },
      body: JSON.stringify({
        from: config.emailFrom,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${txt.slice(0, 200)}` };
    }
    const data = (await res.json()) as { id?: string };
    return { ok: true, id: data.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Bouw een verificatie-mail. URL wijst naar /verify-email?token=… */
export function verifyEmailTemplate(input: {
  name: string;
  verifyUrl: string;
}): { subject: string; html: string; text: string } {
  return {
    subject: "Bevestig je e-mail bij Coffee Garden",
    text: `Hoi ${input.name}, klik op deze link om je e-mail te bevestigen: ${input.verifyUrl}\n\nLink werkt 24 uur.`,
    html: `<!doctype html>
<html lang="nl"><body style="font-family: -apple-system, system-ui, sans-serif; background: #f7f1e6; padding: 24px; color: #2a1a10;">
  <div style="max-width: 480px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 28px;">
    <h1 style="color: #5b3a1f; margin: 0 0 12px;">Bevestig je e-mail ☕</h1>
    <p>Hoi ${escapeHtml(input.name)}, je hebt je net aangemeld voor de Coffee Garden stempelkaart.</p>
    <p>Bevestig je e-mailadres zodat we je een seintje kunnen sturen bij een volle kaart of op je verjaardag.</p>
    <p style="margin: 24px 0;">
      <a href="${input.verifyUrl}" style="background: #5b3a1f; color: #fff; padding: 12px 20px; border-radius: 999px; text-decoration: none; font-weight: 600;">E-mail bevestigen</a>
    </p>
    <p style="font-size: 12px; color: #5b4a3f;">Link werkt 24 uur. Niet jij gevraagd? Negeer deze mail.</p>
  </div>
</body></html>`,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
