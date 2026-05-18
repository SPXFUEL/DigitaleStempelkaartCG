import { STAMPS_FOR_REWARD } from "./constants";
import { getServiceClient } from "./supabase";
import type { Customer } from "./types";

type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  stamps: number;
  total_drinks: number;
  total_rewards: number;
  reward_available: boolean;
  created_at: string;
  updated_at: string;
};

function fromDb(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? undefined,
    stamps: row.stamps,
    totalDrinks: row.total_drinks,
    totalRewards: row.total_rewards,
    rewardAvailable: row.reward_available,
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
}): Promise<Customer> {
  const sb = client();
  const { data, error } = await sb
    .from("customers")
    .insert({
      name: input.name.trim(),
      email: input.email?.trim() || null,
    })
    .select()
    .single<CustomerRow>();
  if (error) throw new Error(error.message);
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

export async function addStamp(customerId: string): Promise<Customer> {
  const sb = client();
  // 1. Fetch current state
  const { data: current, error: fetchErr } = await sb
    .from("customers")
    .select()
    .eq("id", customerId)
    .maybeSingle<CustomerRow>();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!current) throw new Error("Customer not found");
  if (current.reward_available) {
    throw new Error("Reward beschikbaar — eerst inwisselen");
  }

  const nextStamps = current.stamps + 1;
  // 2. Optimistic update: only succeeds if reward_available is still false
  const { data: updated, error: updateErr } = await sb
    .from("customers")
    .update({
      stamps: nextStamps,
      total_drinks: current.total_drinks + 1,
      reward_available: nextStamps >= STAMPS_FOR_REWARD,
    })
    .eq("id", customerId)
    .eq("reward_available", false)
    .select()
    .single<CustomerRow>();
  if (updateErr) throw new Error(updateErr.message);

  // 3. Audit event (best-effort, non-blocking on failure)
  await sb
    .from("stamp_events")
    .insert({
      customer_id: customerId,
      type: "stamp",
      at: updated.updated_at,
    })
    .then(() => {});

  return fromDb(updated);
}

export async function redeemReward(customerId: string): Promise<Customer> {
  const sb = client();
  const { data: current, error: fetchErr } = await sb
    .from("customers")
    .select()
    .eq("id", customerId)
    .maybeSingle<CustomerRow>();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!current) throw new Error("Customer not found");
  if (!current.reward_available) {
    throw new Error("Geen reward beschikbaar");
  }

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

  await sb
    .from("stamp_events")
    .insert({
      customer_id: customerId,
      type: "redeem",
      at: updated.updated_at,
    })
    .then(() => {});

  return fromDb(updated);
}
