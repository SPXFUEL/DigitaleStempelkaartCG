import { STAMPS_FOR_REWARD } from "./constants";
import { config } from "./config";
import { getServiceClient } from "./supabase";
import { isBirthdayActive, currentYearInAms } from "./birthday";
import type {
  AuditLogEntry,
  Customer,
  EmailVerificationToken,
  PushSubscriptionRecord,
  StaffUser,
  StampEvent,
} from "./types";

type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  email_verified: boolean | null;
  stamps: number;
  total_drinks: number;
  total_rewards: number;
  reward_available: boolean;
  birthday: string | null;
  birthday_redeemed_year: number | null;
  referred_by: string | null;
  referrals_count: number | null;
  created_at: string;
  updated_at: string;
};

type EventRow = {
  id?: number;
  customer_id: string;
  type: StampEvent["type"];
  at: string;
  staff_user_id?: string | null;
  reversed?: boolean | null;
};

function fromDb(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? undefined,
    emailVerified: row.email_verified ?? false,
    stamps: row.stamps,
    totalDrinks: row.total_drinks,
    totalRewards: row.total_rewards,
    rewardAvailable: row.reward_available,
    birthday: row.birthday ?? undefined,
    birthdayActive: isBirthdayActive({
      birthday: row.birthday,
      birthdayRedeemedYear: row.birthday_redeemed_year,
    }),
    referredBy: row.referred_by ?? undefined,
    referralsCount: row.referrals_count ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function client() {
  const c = getServiceClient();
  if (!c) throw new Error("Supabase not configured");
  return c;
}

export async function createCustomer(input: {
  name: string;
  email?: string;
  birthday?: string;
  referredBy?: string;
  emailVerified?: boolean;
}): Promise<Customer> {
  const sb = client();
  const startStamps = config.welcomeBonus ? 1 : 0;
  const { data, error } = await sb
    .from("customers")
    .insert({
      name: input.name.trim(),
      email: input.email?.trim() || null,
      email_verified: input.emailVerified ?? false,
      birthday: input.birthday || null,
      stamps: startStamps,
      total_drinks: startStamps,
      reward_available: startStamps >= STAMPS_FOR_REWARD,
      referred_by: input.referredBy ?? null,
    })
    .select()
    .single<CustomerRow>();
  if (error) throw new Error(error.message);

  if (startStamps > 0) {
    await sb.from("stamp_events").insert({
      customer_id: data.id,
      type: "welcome",
      at: data.created_at,
    });
  }

  return fromDb(data);
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const sb = client();
  const { data, error } = await sb
    .from("customers")
    .select()
    .eq("id", id)
    .maybeSingle<CustomerRow>();
  if (error) throw new Error(error.message);
  return data ? fromDb(data) : null;
}

export async function listCustomers(): Promise<Customer[]> {
  const sb = client();
  const { data, error } = await sb
    .from("customers")
    .select()
    .order("updated_at", { ascending: false })
    .limit(50)
    .returns<CustomerRow[]>();
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromDb);
}

export async function getCustomerEvents(
  customerId: string
): Promise<StampEvent[]> {
  const sb = client();
  const { data, error } = await sb
    .from("stamp_events")
    .select("id, customer_id, type, at, staff_user_id, reversed")
    .eq("customer_id", customerId)
    .order("at", { ascending: true })
    .returns<EventRow[]>();
  if (error) throw new Error(error.message);
  return (data ?? []).map((e) => ({
    customerId: e.customer_id,
    type: e.type,
    at: e.at,
    staffUserId: e.staff_user_id ?? null,
    reversed: e.reversed ?? false,
  }));
}

export async function listAllEvents(sinceIso?: string): Promise<StampEvent[]> {
  const sb = client();
  let q = sb
    .from("stamp_events")
    .select("id, customer_id, type, at, staff_user_id, reversed")
    .order("at", { ascending: true })
    .limit(10000);
  if (sinceIso) q = q.gte("at", sinceIso);
  const { data, error } = await q.returns<EventRow[]>();
  if (error) throw new Error(error.message);
  return (data ?? []).map((e) => ({
    customerId: e.customer_id,
    type: e.type,
    at: e.at,
    staffUserId: e.staff_user_id ?? null,
    reversed: e.reversed ?? false,
  }));
}

export async function countCustomers(): Promise<number> {
  const sb = client();
  const { count, error } = await sb
    .from("customers")
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function listTopCustomers(limit: number): Promise<Customer[]> {
  const sb = client();
  const { data, error } = await sb
    .from("customers")
    .select()
    .order("total_drinks", { ascending: false })
    .limit(limit)
    .returns<CustomerRow[]>();
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromDb);
}

export async function listCustomersWithBirthday(): Promise<Customer[]> {
  const sb = client();
  const { data, error } = await sb
    .from("customers")
    .select()
    .not("birthday", "is", null)
    .returns<CustomerRow[]>();
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromDb);
}

export async function listCustomersWithRewardAvailable(): Promise<Customer[]> {
  const sb = client();
  const { data, error } = await sb
    .from("customers")
    .select()
    .eq("reward_available", true)
    .returns<CustomerRow[]>();
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromDb);
}

export async function addStamp(
  customerId: string,
  opts?: { type?: StampEvent["type"]; staffUserId?: string | null }
): Promise<Customer> {
  const sb = client();
  const { data: current, error: fetchErr } = await sb
    .from("customers")
    .select()
    .eq("id", customerId)
    .maybeSingle<CustomerRow>();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!current) throw new Error("Customer not found");
  if (current.reward_available && opts?.type !== "referral") {
    throw new Error("Reward beschikbaar — eerst inwisselen");
  }

  const nextStamps = current.stamps + 1;
  // Voor een referral-bonus laten we reward_available staan zoals 'ie was
  // (we willen niet midden in een vol-kaart-state nog een extra stempel toevoegen).
  const newRewardAvailable =
    opts?.type === "referral"
      ? current.reward_available
      : nextStamps >= STAMPS_FOR_REWARD;
  const { data: updated, error: updateErr } = await sb
    .from("customers")
    .update({
      stamps: nextStamps,
      total_drinks: current.total_drinks + 1,
      reward_available: newRewardAvailable,
    })
    .eq("id", customerId)
    // Voor een normale stempel mag reward_available nog niet true zijn;
    // voor referral-bonus laat de check los.
    .match(
      opts?.type === "referral"
        ? { id: customerId }
        : { id: customerId, reward_available: false }
    )
    .select()
    .single<CustomerRow>();
  if (updateErr) throw new Error(updateErr.message);

  await sb.from("stamp_events").insert({
    customer_id: customerId,
    type: opts?.type ?? "stamp",
    at: updated.updated_at,
    staff_user_id: opts?.staffUserId ?? null,
  });

  return fromDb(updated);
}

export async function undoLastStamp(
  customerId: string,
  withinSec: number
): Promise<Customer> {
  const sb = client();

  // Vind laatste niet-reversed stamp/welcome/referral event van deze klant
  const { data: events, error: evErr } = await sb
    .from("stamp_events")
    .select("id, customer_id, type, at, reversed")
    .eq("customer_id", customerId)
    .in("type", ["stamp", "welcome", "referral"])
    .order("at", { ascending: false })
    .limit(5)
    .returns<EventRow[]>();
  if (evErr) throw new Error(evErr.message);
  const target = (events ?? []).find((e) => !e.reversed);
  if (!target || target.id === undefined)
    throw new Error("Geen stempel om terug te draaien");

  const age = (Date.now() - new Date(target.at).getTime()) / 1000;
  if (age > withinSec) {
    throw new Error(`Te laat — undo werkt binnen ${withinSec}s`);
  }

  await sb.from("stamp_events").update({ reversed: true }).eq("id", target.id);

  const { data: cur, error: curErr } = await sb
    .from("customers")
    .select()
    .eq("id", customerId)
    .single<CustomerRow>();
  if (curErr) throw new Error(curErr.message);

  const nextStamps = Math.max(0, cur.stamps - 1);
  const { data: updated, error: updErr } = await sb
    .from("customers")
    .update({
      stamps: nextStamps,
      total_drinks: Math.max(0, cur.total_drinks - 1),
      reward_available: nextStamps >= STAMPS_FOR_REWARD,
    })
    .eq("id", customerId)
    .select()
    .single<CustomerRow>();
  if (updErr) throw new Error(updErr.message);

  return fromDb(updated);
}

export async function redeemReward(
  customerId: string,
  opts?: { staffUserId?: string | null }
): Promise<Customer> {
  const sb = client();
  const { data: current, error: fetchErr } = await sb
    .from("customers")
    .select()
    .eq("id", customerId)
    .maybeSingle<CustomerRow>();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!current) throw new Error("Customer not found");
  if (!current.reward_available) throw new Error("Geen reward beschikbaar");

  const { data: updated, error: updateErr } = await sb
    .from("customers")
    .update({
      stamps: 0,
      reward_available: false,
      total_rewards: current.total_rewards + 1,
      total_drinks: current.total_drinks + 1,
    })
    .eq("id", customerId)
    .eq("reward_available", true)
    .select()
    .single<CustomerRow>();
  if (updateErr) throw new Error(updateErr.message);

  await sb.from("stamp_events").insert({
    customer_id: customerId,
    type: "redeem",
    at: updated.updated_at,
    staff_user_id: opts?.staffUserId ?? null,
  });

  return fromDb(updated);
}

type PushSubRow = {
  id: number;
  customer_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  failure_count: number;
};

export async function savePushSubscription(
  sub: PushSubscriptionRecord
): Promise<void> {
  const sb = client();
  const { error } = await sb.from("push_subscriptions").upsert(
    {
      customer_id: sub.customerId,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
      user_agent: sub.userAgent ?? null,
      failure_count: 0,
    },
    { onConflict: "endpoint" }
  );
  if (error) throw new Error(error.message);
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const sb = client();
  const { error } = await sb
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  if (error) throw new Error(error.message);
}

export async function listPushSubscriptionsForCustomer(
  customerId: string
): Promise<PushSubscriptionRecord[]> {
  const sb = client();
  const { data, error } = await sb
    .from("push_subscriptions")
    .select()
    .eq("customer_id", customerId)
    .lt("failure_count", 5)
    .returns<PushSubRow[]>();
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    customerId: r.customer_id,
    endpoint: r.endpoint,
    p256dh: r.p256dh,
    auth: r.auth,
    userAgent: r.user_agent ?? undefined,
    failureCount: r.failure_count,
  }));
}

export async function markPushSubscriptionFailure(
  endpoint: string,
  remove: boolean
): Promise<void> {
  const sb = client();
  if (remove) {
    const { error } = await sb
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint);
    if (error) throw new Error(error.message);
  } else {
    const { data } = await sb
      .from("push_subscriptions")
      .select("failure_count")
      .eq("endpoint", endpoint)
      .maybeSingle<{ failure_count: number }>();
    if (data) {
      await sb
        .from("push_subscriptions")
        .update({
          failure_count: data.failure_count + 1,
          last_failure_at: new Date().toISOString(),
        })
        .eq("endpoint", endpoint);
    }
  }
}

export async function redeemBirthday(
  customerId: string,
  opts?: { staffUserId?: string | null }
): Promise<Customer> {
  const sb = client();
  const { data: current, error: fetchErr } = await sb
    .from("customers")
    .select()
    .eq("id", customerId)
    .maybeSingle<CustomerRow>();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!current) throw new Error("Customer not found");
  if (
    !isBirthdayActive({
      birthday: current.birthday,
      birthdayRedeemedYear: current.birthday_redeemed_year,
    })
  ) {
    throw new Error("Geen verjaardags-tractatie beschikbaar");
  }

  const year = currentYearInAms();
  const { data: updated, error: updateErr } = await sb
    .from("customers")
    .update({
      birthday_redeemed_year: year,
      total_drinks: current.total_drinks + 1,
    })
    .eq("id", customerId)
    .select()
    .single<CustomerRow>();
  if (updateErr) throw new Error(updateErr.message);

  await sb.from("stamp_events").insert({
    customer_id: customerId,
    type: "birthday",
    at: updated.updated_at,
    staff_user_id: opts?.staffUserId ?? null,
  });

  return fromDb(updated);
}

export async function deleteCustomer(customerId: string): Promise<void> {
  const sb = client();
  // ON DELETE CASCADE op stamp_events + push_subscriptions doet de rest.
  const { error } = await sb.from("customers").delete().eq("id", customerId);
  if (error) throw new Error(error.message);
}

export async function setCustomerEmailVerified(
  customerId: string,
  verified: boolean
): Promise<void> {
  const sb = client();
  const { error } = await sb
    .from("customers")
    .update({ email_verified: verified })
    .eq("id", customerId);
  if (error) throw new Error(error.message);
}

export async function listInactiveCustomers(
  cutoffIso: string
): Promise<Customer[]> {
  const sb = client();
  const { data, error } = await sb
    .from("customers")
    .select()
    .lt("updated_at", cutoffIso)
    .returns<CustomerRow[]>();
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromDb);
}

// --- Staff users ---

type StaffRow = {
  id: string;
  name: string;
  role: "barista" | "admin";
  pin_hash: string;
  created_at: string;
  last_login_at: string | null;
  deactivated_at: string | null;
};

function fromStaff(r: StaffRow): StaffUser {
  return {
    id: r.id,
    name: r.name,
    role: r.role,
    pinHash: r.pin_hash,
    createdAt: r.created_at,
    lastLoginAt: r.last_login_at ?? undefined,
    deactivatedAt: r.deactivated_at ?? undefined,
  };
}

export async function listStaffUsers(): Promise<StaffUser[]> {
  const sb = client();
  const { data, error } = await sb
    .from("staff_users")
    .select()
    .order("created_at", { ascending: true })
    .returns<StaffRow[]>();
  if (error) throw new Error(error.message);
  return (data ?? []).map(fromStaff);
}

export async function getStaffUser(id: string): Promise<StaffUser | null> {
  const sb = client();
  const { data, error } = await sb
    .from("staff_users")
    .select()
    .eq("id", id)
    .maybeSingle<StaffRow>();
  if (error) throw new Error(error.message);
  return data ? fromStaff(data) : null;
}

export async function createStaffUser(input: {
  name: string;
  role: "barista" | "admin";
  pinHash: string;
}): Promise<StaffUser> {
  const sb = client();
  const { data, error } = await sb
    .from("staff_users")
    .insert({
      name: input.name,
      role: input.role,
      pin_hash: input.pinHash,
    })
    .select()
    .single<StaffRow>();
  if (error) throw new Error(error.message);
  return fromStaff(data);
}

export async function deactivateStaffUser(id: string): Promise<void> {
  const sb = client();
  const { error } = await sb
    .from("staff_users")
    .update({ deactivated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function touchStaffLogin(id: string): Promise<void> {
  const sb = client();
  await sb
    .from("staff_users")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", id);
}

// --- Audit log ---

type AuditRow = {
  id: number;
  action: AuditLogEntry["action"];
  customer_id: string | null;
  staff_user_id: string | null;
  ip: string | null;
  user_agent: string | null;
  meta: Record<string, unknown> | null;
  at: string;
};

export async function appendAudit(entry: AuditLogEntry): Promise<void> {
  const sb = client();
  await sb.from("audit_log").insert({
    action: entry.action,
    customer_id: entry.customerId ?? null,
    staff_user_id: entry.staffUserId ?? null,
    ip: entry.ip ?? null,
    user_agent: entry.userAgent ?? null,
    meta: entry.meta ?? null,
    at: entry.at,
  });
}

export async function listAudit(opts?: {
  limit?: number;
  sinceIso?: string;
}): Promise<AuditLogEntry[]> {
  const sb = client();
  let q = sb
    .from("audit_log")
    .select()
    .order("at", { ascending: false })
    .limit(opts?.limit ?? 100);
  if (opts?.sinceIso) q = q.gte("at", opts.sinceIso);
  const { data, error } = await q.returns<AuditRow[]>();
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    action: r.action,
    customerId: r.customer_id,
    staffUserId: r.staff_user_id,
    ip: r.ip,
    userAgent: r.user_agent,
    meta: r.meta ?? undefined,
    at: r.at,
  }));
}

// --- E-mail verification ---

export async function createEmailToken(
  token: EmailVerificationToken
): Promise<void> {
  const sb = client();
  await sb.from("email_tokens").insert({
    token: token.token,
    customer_id: token.customerId,
    email: token.email,
    expires_at: token.expiresAt,
  });
}

export async function consumeEmailToken(
  tokenValue: string
): Promise<EmailVerificationToken | null> {
  const sb = client();
  type Row = {
    token: string;
    customer_id: string;
    email: string;
    expires_at: string;
    consumed_at: string | null;
  };
  const { data, error } = await sb
    .from("email_tokens")
    .select()
    .eq("token", tokenValue)
    .maybeSingle<Row>();
  if (error) throw new Error(error.message);
  if (!data) return null;
  if (data.consumed_at) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  const now = new Date().toISOString();
  await sb
    .from("email_tokens")
    .update({ consumed_at: now })
    .eq("token", tokenValue);
  return {
    token: data.token,
    customerId: data.customer_id,
    email: data.email,
    expiresAt: data.expires_at,
    consumedAt: now,
  };
}

// --- Referral helpers ---

export async function incrementReferralsCount(
  customerId: string
): Promise<void> {
  const sb = client();
  // Postgres rpc zou sneller zijn, maar voor zeldzame writes prima:
  const { data: cur } = await sb
    .from("customers")
    .select("referrals_count")
    .eq("id", customerId)
    .maybeSingle<{ referrals_count: number | null }>();
  if (!cur) return;
  await sb
    .from("customers")
    .update({ referrals_count: (cur.referrals_count ?? 0) + 1 })
    .eq("id", customerId);
}
