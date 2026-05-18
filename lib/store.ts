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
import type { Customer, StampEvent } from "./types";

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

export function addStamp(customerId: string): Promise<Customer> {
  return backend.addStamp(customerId);
}

export function redeemReward(customerId: string): Promise<Customer> {
  return backend.redeemReward(customerId);
}

export function redeemBirthday(customerId: string): Promise<Customer> {
  return backend.redeemBirthday(customerId);
}
