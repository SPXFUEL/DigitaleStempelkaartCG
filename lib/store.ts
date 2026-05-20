/**
 * Store router — picks the right backend based on env vars.
 *
 * - When NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
 *   (Vercel/production), it uses Supabase Postgres.
 * - Otherwise it falls back to the JSON-file store in /data/store.json.
 *
 * Exported signatures zijn identiek tussen backends.
 */

import { isSupabaseConfigured } from "./supabase";
import type {
  AuditLogEntry,
  Customer,
  EmailVerificationToken,
  PushSubscriptionRecord,
  StaffUser,
  StampEvent,
} from "./types";

import * as fileStore from "./store-file";
import * as supaStore from "./store-supabase";

const useSupabase = isSupabaseConfigured();
const backend = useSupabase ? supaStore : fileStore;

if (process.env.NODE_ENV !== "test") {
  console.log(`[cg] store backend: ${useSupabase ? "supabase" : "file"}`);
}

export function createCustomer(input: {
  name: string;
  email?: string;
  birthday?: string;
  referredBy?: string;
  emailVerified?: boolean;
}): Promise<Customer> {
  return backend.createCustomer(input);
}

export function getCustomer(id: string): Promise<Customer | null> {
  return backend.getCustomer(id);
}

export function listCustomers(): Promise<Customer[]> {
  return backend.listCustomers();
}

export function getCustomerEvents(customerId: string): Promise<StampEvent[]> {
  return backend.getCustomerEvents(customerId);
}

export function listAllEvents(sinceIso?: string): Promise<StampEvent[]> {
  return backend.listAllEvents(sinceIso);
}

export function countCustomers(): Promise<number> {
  return backend.countCustomers();
}

export function listTopCustomers(limit: number): Promise<Customer[]> {
  return backend.listTopCustomers(limit);
}

export function listCustomersWithBirthday(): Promise<Customer[]> {
  return backend.listCustomersWithBirthday();
}

export function listCustomersWithRewardAvailable(): Promise<Customer[]> {
  return backend.listCustomersWithRewardAvailable();
}

export function addStamp(
  customerId: string,
  opts?: { type?: StampEvent["type"]; staffUserId?: string | null }
): Promise<Customer> {
  return backend.addStamp(customerId, opts);
}

export function undoLastStamp(
  customerId: string,
  withinSec: number
): Promise<Customer> {
  return backend.undoLastStamp(customerId, withinSec);
}

export function redeemReward(
  customerId: string,
  opts?: { staffUserId?: string | null }
): Promise<Customer> {
  return backend.redeemReward(customerId, opts);
}

export function redeemBirthday(
  customerId: string,
  opts?: { staffUserId?: string | null }
): Promise<Customer> {
  return backend.redeemBirthday(customerId, opts);
}

export function deleteCustomer(customerId: string): Promise<void> {
  return backend.deleteCustomer(customerId);
}

export function setCustomerEmailVerified(
  customerId: string,
  verified: boolean
): Promise<void> {
  return backend.setCustomerEmailVerified(customerId, verified);
}

export function listInactiveCustomers(cutoffIso: string): Promise<Customer[]> {
  return backend.listInactiveCustomers(cutoffIso);
}

export function savePushSubscription(
  sub: PushSubscriptionRecord
): Promise<void> {
  return backend.savePushSubscription(sub);
}

export function removePushSubscription(endpoint: string): Promise<void> {
  return backend.removePushSubscription(endpoint);
}

export function listPushSubscriptionsForCustomer(
  customerId: string
): Promise<PushSubscriptionRecord[]> {
  return backend.listPushSubscriptionsForCustomer(customerId);
}

export function markPushSubscriptionFailure(
  endpoint: string,
  remove: boolean
): Promise<void> {
  return backend.markPushSubscriptionFailure(endpoint, remove);
}

// --- Staff users ---

export function listStaffUsers(): Promise<StaffUser[]> {
  return backend.listStaffUsers();
}

export function getStaffUser(id: string): Promise<StaffUser | null> {
  return backend.getStaffUser(id);
}

export function createStaffUser(input: {
  name: string;
  role: "barista" | "admin";
  pinHash: string;
}): Promise<StaffUser> {
  return backend.createStaffUser(input);
}

export function deactivateStaffUser(id: string): Promise<void> {
  return backend.deactivateStaffUser(id);
}

export function touchStaffLogin(id: string): Promise<void> {
  return backend.touchStaffLogin(id);
}

// --- Audit log ---

export function appendAudit(entry: AuditLogEntry): Promise<void> {
  return backend.appendAudit(entry);
}

export function listAudit(opts?: {
  limit?: number;
  sinceIso?: string;
}): Promise<AuditLogEntry[]> {
  return backend.listAudit(opts);
}

// --- E-mail verification tokens ---

export function createEmailToken(token: EmailVerificationToken): Promise<void> {
  return backend.createEmailToken(token);
}

export function consumeEmailToken(
  token: string
): Promise<EmailVerificationToken | null> {
  return backend.consumeEmailToken(token);
}

// --- Referral helpers ---

export function incrementReferralsCount(customerId: string): Promise<void> {
  return backend.incrementReferralsCount(customerId);
}
