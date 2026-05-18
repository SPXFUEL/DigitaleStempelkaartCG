import webpush from "web-push";
import {
  listPushSubscriptionsForCustomer,
  markPushSubscriptionFailure,
} from "./store";
import type { PushSubscriptionRecord } from "./types";

let configured = false;

function configureWebPush(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  /** URL die geopend wordt bij tikken op de notificatie */
  url?: string;
  /** Tag — als 2 notificaties dezelfde tag hebben, vervangt de nieuwe de oude */
  tag?: string;
  /** Emoji of icoon-url; default is /icons/logo-192.png */
  icon?: string;
}

/**
 * Stuur een push naar één specifieke subscription. Behandelt 410 Gone door
 * de sub te verwijderen, andere errors door failure_count op te hogen.
 */
async function sendToSub(
  sub: PushSubscriptionRecord,
  payload: PushPayload
): Promise<{ ok: boolean; error?: string }> {
  if (!configureWebPush()) return { ok: false, error: "VAPID niet geconfigureerd" };

  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 } // 1 dag — Push service mag 'm in de tussentijd droppen
    );
    return { ok: true };
  } catch (err: unknown) {
    const errObj = err as { statusCode?: number; message?: string };
    const statusCode = errObj.statusCode;
    const message = errObj.message ?? "unknown";

    // 404/410 = subscription is verlopen of geweigerd → verwijderen
    if (statusCode === 404 || statusCode === 410) {
      await markPushSubscriptionFailure(sub.endpoint, true);
      return { ok: false, error: `verwijderd (${statusCode})` };
    }

    // Andere errors: failure_count ophogen (na 5 fails wordt 'ie genegeerd)
    await markPushSubscriptionFailure(sub.endpoint, false);
    return { ok: false, error: `${statusCode ?? "?"}: ${message}` };
  }
}

/**
 * Stuur een push naar alle (actieve) devices van een klant.
 * Returns het aantal geslaagde leveringen.
 */
export async function sendPushToCustomer(
  customerId: string,
  payload: PushPayload
): Promise<{ delivered: number; failed: number }> {
  const subs = await listPushSubscriptionsForCustomer(customerId);
  if (subs.length === 0) return { delivered: 0, failed: 0 };

  const results = await Promise.allSettled(
    subs.map((s) => sendToSub(s, payload))
  );

  let delivered = 0;
  let failed = 0;
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.ok) delivered++;
    else failed++;
  }
  return { delivered, failed };
}

/**
 * Fire-and-forget variant — gebruik vanuit een API-route die zelf niet op de
 * push moet wachten (bv. de /api/stamp endpoint). Failures worden alleen
 * gelogd, niet doorgegeven.
 */
export function firePushToCustomer(
  customerId: string,
  payload: PushPayload
): void {
  sendPushToCustomer(customerId, payload)
    .then((r) =>
      console.log(
        `[push] customer=${customerId.slice(0, 8)} delivered=${r.delivered} failed=${r.failed} title="${payload.title}"`
      )
    )
    .catch((err) => console.error(`[push] error for ${customerId}:`, err));
}
