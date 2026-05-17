import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { STAMPS_FOR_REWARD } from "./constants";
import type { Customer, StoreShape } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

const memoryStore: StoreShape = { customers: {}, events: [] };
let loaded = false;
let writeQueue: Promise<void> = Promise.resolve();

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(STORE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as StoreShape;
    memoryStore.customers = parsed.customers ?? {};
    memoryStore.events = parsed.events ?? [];
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "ENOENT"
    ) {
      await persist();
    } else {
      throw err;
    }
  }
  loaded = true;
}

async function persist(): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = STORE_FILE + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(memoryStore, null, 2), "utf-8");
    await fs.rename(tmp, STORE_FILE);
  });
  await writeQueue;
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function createCustomer(input: {
  name: string;
  email?: string;
}): Promise<Customer> {
  await ensureLoaded();
  const id = randomUUID();
  const customer: Customer = {
    id,
    name: input.name.trim(),
    email: input.email?.trim() || undefined,
    stamps: 0,
    totalDrinks: 0,
    totalRewards: 0,
    rewardAvailable: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  memoryStore.customers[id] = customer;
  await persist();
  return customer;
}

export async function getCustomer(id: string): Promise<Customer | null> {
  await ensureLoaded();
  return memoryStore.customers[id] ?? null;
}

export async function listCustomers(): Promise<Customer[]> {
  await ensureLoaded();
  return Object.values(memoryStore.customers).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
}

export async function addStamp(customerId: string): Promise<Customer> {
  await ensureLoaded();
  const customer = memoryStore.customers[customerId];
  if (!customer) {
    throw new Error("Customer not found");
  }
  if (customer.rewardAvailable) {
    throw new Error("Reward beschikbaar — eerst inwisselen");
  }
  customer.stamps += 1;
  customer.totalDrinks += 1;
  customer.updatedAt = nowIso();
  if (customer.stamps >= STAMPS_FOR_REWARD) {
    customer.rewardAvailable = true;
  }
  memoryStore.events.push({ customerId, type: "stamp", at: customer.updatedAt });
  await persist();
  return customer;
}

export async function redeemReward(customerId: string): Promise<Customer> {
  await ensureLoaded();
  const customer = memoryStore.customers[customerId];
  if (!customer) {
    throw new Error("Customer not found");
  }
  if (!customer.rewardAvailable) {
    throw new Error("Geen reward beschikbaar");
  }
  customer.stamps = 0;
  customer.rewardAvailable = false;
  customer.totalRewards += 1;
  customer.totalDrinks += 1;
  customer.updatedAt = nowIso();
  memoryStore.events.push({ customerId, type: "redeem", at: customer.updatedAt });
  await persist();
  return customer;
}
