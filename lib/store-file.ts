import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { STAMPS_FOR_REWARD } from "./constants";
import { isBirthdayActive, currentYearInAms } from "./birthday";
import type {
  Customer,
  CustomerRecord,
  StampEvent,
  StoreShape,
} from "./types";

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

function toCustomer(r: CustomerRecord): Customer {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    stamps: r.stamps,
    totalDrinks: r.totalDrinks,
    totalRewards: r.totalRewards,
    rewardAvailable: r.rewardAvailable,
    birthday: r.birthday,
    birthdayActive: isBirthdayActive({
      birthday: r.birthday,
      birthdayRedeemedYear: r.birthdayRedeemedYear,
    }),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function createCustomer(input: {
  name: string;
  email?: string;
  birthday?: string;
}): Promise<Customer> {
  await ensureLoaded();
  const id = randomUUID();
  const rec: CustomerRecord = {
    id,
    name: input.name.trim(),
    email: input.email?.trim() || undefined,
    birthday: input.birthday || undefined,
    stamps: 0,
    totalDrinks: 0,
    totalRewards: 0,
    rewardAvailable: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  memoryStore.customers[id] = rec;
  await persist();
  return toCustomer(rec);
}

export async function getCustomer(id: string): Promise<Customer | null> {
  await ensureLoaded();
  const rec = memoryStore.customers[id];
  return rec ? toCustomer(rec) : null;
}

export async function listCustomers(): Promise<Customer[]> {
  await ensureLoaded();
  return Object.values(memoryStore.customers)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(toCustomer);
}

export async function getCustomerEvents(
  customerId: string
): Promise<StampEvent[]> {
  await ensureLoaded();
  return memoryStore.events
    .filter((e) => e.customerId === customerId)
    .sort((a, b) => a.at.localeCompare(b.at));
}

export async function listAllEvents(sinceIso?: string): Promise<StampEvent[]> {
  await ensureLoaded();
  let events = memoryStore.events;
  if (sinceIso) events = events.filter((e) => e.at >= sinceIso);
  return [...events].sort((a, b) => a.at.localeCompare(b.at));
}

export async function countCustomers(): Promise<number> {
  await ensureLoaded();
  return Object.keys(memoryStore.customers).length;
}

export async function listTopCustomers(limit: number): Promise<Customer[]> {
  await ensureLoaded();
  return Object.values(memoryStore.customers)
    .sort((a, b) => b.totalDrinks - a.totalDrinks)
    .slice(0, limit)
    .map(toCustomer);
}

export async function listCustomersWithBirthday(): Promise<Customer[]> {
  await ensureLoaded();
  return Object.values(memoryStore.customers)
    .filter((r) => r.birthday)
    .map(toCustomer);
}

export async function addStamp(customerId: string): Promise<Customer> {
  await ensureLoaded();
  const rec = memoryStore.customers[customerId];
  if (!rec) throw new Error("Customer not found");
  if (rec.rewardAvailable) {
    throw new Error("Reward beschikbaar — eerst inwisselen");
  }
  rec.stamps += 1;
  rec.totalDrinks += 1;
  rec.updatedAt = nowIso();
  if (rec.stamps >= STAMPS_FOR_REWARD) {
    rec.rewardAvailable = true;
  }
  memoryStore.events.push({
    customerId,
    type: "stamp",
    at: rec.updatedAt,
  });
  await persist();
  return toCustomer(rec);
}

export async function redeemReward(customerId: string): Promise<Customer> {
  await ensureLoaded();
  const rec = memoryStore.customers[customerId];
  if (!rec) throw new Error("Customer not found");
  if (!rec.rewardAvailable) throw new Error("Geen reward beschikbaar");
  rec.stamps = 0;
  rec.rewardAvailable = false;
  rec.totalRewards += 1;
  rec.totalDrinks += 1;
  rec.updatedAt = nowIso();
  memoryStore.events.push({
    customerId,
    type: "redeem",
    at: rec.updatedAt,
  });
  await persist();
  return toCustomer(rec);
}

export async function redeemBirthday(customerId: string): Promise<Customer> {
  await ensureLoaded();
  const rec = memoryStore.customers[customerId];
  if (!rec) throw new Error("Customer not found");
  if (
    !isBirthdayActive({
      birthday: rec.birthday,
      birthdayRedeemedYear: rec.birthdayRedeemedYear,
    })
  ) {
    throw new Error("Geen verjaardags-tractatie beschikbaar");
  }
  rec.birthdayRedeemedYear = currentYearInAms();
  rec.totalDrinks += 1;
  rec.updatedAt = nowIso();
  memoryStore.events.push({
    customerId,
    type: "birthday",
    at: rec.updatedAt,
  });
  await persist();
  return toCustomer(rec);
}
