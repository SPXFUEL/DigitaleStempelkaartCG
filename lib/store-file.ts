import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { STAMPS_FOR_REWARD } from "./constants";
import { config } from "./config";
import { isBirthdayActive, currentYearInAms } from "./birthday";
import type {
  AuditLogEntry,
  Customer,
  CustomerRecord,
  EmailVerificationToken,
  PushSubscriptionRecord,
  StaffUser,
  StampEvent,
  StoreShape,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

const memoryStore: StoreShape = {
  customers: {},
  events: [],
  pushSubscriptions: [],
  staffUsers: [],
  auditLog: [],
  emailTokens: [],
};
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
    memoryStore.pushSubscriptions = parsed.pushSubscriptions ?? [];
    memoryStore.staffUsers = parsed.staffUsers ?? [];
    memoryStore.auditLog = parsed.auditLog ?? [];
    memoryStore.emailTokens = parsed.emailTokens ?? [];
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
    emailVerified: r.emailVerified ?? false,
    stamps: r.stamps,
    totalDrinks: r.totalDrinks,
    totalRewards: r.totalRewards,
    rewardAvailable: r.rewardAvailable,
    birthday: r.birthday,
    birthdayActive: isBirthdayActive({
      birthday: r.birthday,
      birthdayRedeemedYear: r.birthdayRedeemedYear,
    }),
    referredBy: r.referredBy,
    referralsCount: r.referralsCount ?? 0,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function createCustomer(input: {
  name: string;
  email?: string;
  birthday?: string;
  referredBy?: string;
  emailVerified?: boolean;
}): Promise<Customer> {
  await ensureLoaded();
  const id = randomUUID();
  const startStamps = config.welcomeBonus ? 1 : 0;
  const rec: CustomerRecord = {
    id,
    name: input.name.trim(),
    email: input.email?.trim() || undefined,
    emailVerified: input.emailVerified ?? false,
    birthday: input.birthday || undefined,
    stamps: startStamps,
    totalDrinks: startStamps,
    totalRewards: 0,
    rewardAvailable: startStamps >= STAMPS_FOR_REWARD,
    referredBy: input.referredBy,
    referralsCount: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  memoryStore.customers[id] = rec;
  if (startStamps > 0) {
    memoryStore.events.push({
      customerId: id,
      type: "welcome",
      at: rec.createdAt,
    });
  }
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

export async function listCustomersWithRewardAvailable(): Promise<Customer[]> {
  await ensureLoaded();
  return Object.values(memoryStore.customers)
    .filter((r) => r.rewardAvailable)
    .map(toCustomer);
}

export async function addStamp(
  customerId: string,
  opts?: { type?: StampEvent["type"]; staffUserId?: string | null }
): Promise<Customer> {
  await ensureLoaded();
  const rec = memoryStore.customers[customerId];
  if (!rec) throw new Error("Customer not found");
  if (rec.rewardAvailable && opts?.type !== "referral") {
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
    type: opts?.type ?? "stamp",
    at: rec.updatedAt,
    staffUserId: opts?.staffUserId ?? null,
  });
  await persist();
  return toCustomer(rec);
}

export async function undoLastStamp(
  customerId: string,
  withinSec: number
): Promise<Customer> {
  await ensureLoaded();
  const rec = memoryStore.customers[customerId];
  if (!rec) throw new Error("Customer not found");

  // Vind de laatste niet-reversed stempel-event van deze klant.
  let target: StampEvent | null = null;
  for (let i = memoryStore.events.length - 1; i >= 0; i--) {
    const e = memoryStore.events[i];
    if (e.customerId !== customerId) continue;
    if (e.reversed) continue;
    if (e.type === "stamp" || e.type === "welcome" || e.type === "referral") {
      target = e;
      break;
    }
  }
  if (!target) throw new Error("Geen stempel om terug te draaien");

  const age = (Date.now() - new Date(target.at).getTime()) / 1000;
  if (age > withinSec) {
    throw new Error(`Te laat — undo werkt binnen ${withinSec}s`);
  }

  target.reversed = true;
  rec.stamps = Math.max(0, rec.stamps - 1);
  rec.totalDrinks = Math.max(0, rec.totalDrinks - 1);
  if (rec.stamps < STAMPS_FOR_REWARD) rec.rewardAvailable = false;
  rec.updatedAt = nowIso();
  await persist();
  return toCustomer(rec);
}

export async function redeemReward(
  customerId: string,
  opts?: { staffUserId?: string | null }
): Promise<Customer> {
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
    staffUserId: opts?.staffUserId ?? null,
  });
  await persist();
  return toCustomer(rec);
}

export async function savePushSubscription(
  sub: PushSubscriptionRecord
): Promise<void> {
  await ensureLoaded();
  const list = memoryStore.pushSubscriptions ?? [];
  const existing = list.findIndex((s) => s.endpoint === sub.endpoint);
  if (existing >= 0) {
    list[existing] = { ...list[existing], ...sub };
  } else {
    list.push({ ...sub, failureCount: 0 });
  }
  memoryStore.pushSubscriptions = list;
  await persist();
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  await ensureLoaded();
  const list = memoryStore.pushSubscriptions ?? [];
  memoryStore.pushSubscriptions = list.filter((s) => s.endpoint !== endpoint);
  await persist();
}

export async function listPushSubscriptionsForCustomer(
  customerId: string
): Promise<PushSubscriptionRecord[]> {
  await ensureLoaded();
  return (memoryStore.pushSubscriptions ?? []).filter(
    (s) => s.customerId === customerId && s.failureCount < 5
  );
}

export async function markPushSubscriptionFailure(
  endpoint: string,
  remove: boolean
): Promise<void> {
  await ensureLoaded();
  const list = memoryStore.pushSubscriptions ?? [];
  if (remove) {
    memoryStore.pushSubscriptions = list.filter((s) => s.endpoint !== endpoint);
  } else {
    const sub = list.find((s) => s.endpoint === endpoint);
    if (sub) sub.failureCount += 1;
  }
  await persist();
}

export async function redeemBirthday(
  customerId: string,
  opts?: { staffUserId?: string | null }
): Promise<Customer> {
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
    staffUserId: opts?.staffUserId ?? null,
  });
  await persist();
  return toCustomer(rec);
}

export async function deleteCustomer(customerId: string): Promise<void> {
  await ensureLoaded();
  delete memoryStore.customers[customerId];
  memoryStore.events = memoryStore.events.filter(
    (e) => e.customerId !== customerId
  );
  memoryStore.pushSubscriptions = (memoryStore.pushSubscriptions ?? []).filter(
    (s) => s.customerId !== customerId
  );
  memoryStore.emailTokens = (memoryStore.emailTokens ?? []).filter(
    (t) => t.customerId !== customerId
  );
  await persist();
}

export async function setCustomerEmailVerified(
  customerId: string,
  verified: boolean
): Promise<void> {
  await ensureLoaded();
  const rec = memoryStore.customers[customerId];
  if (!rec) return;
  rec.emailVerified = verified;
  rec.updatedAt = nowIso();
  await persist();
}

export async function listInactiveCustomers(
  cutoffIso: string
): Promise<Customer[]> {
  await ensureLoaded();
  return Object.values(memoryStore.customers)
    .filter((r) => r.updatedAt < cutoffIso)
    .map(toCustomer);
}

// --- Staff users ---

export async function listStaffUsers(): Promise<StaffUser[]> {
  await ensureLoaded();
  return [...(memoryStore.staffUsers ?? [])];
}

export async function getStaffUser(id: string): Promise<StaffUser | null> {
  await ensureLoaded();
  return (memoryStore.staffUsers ?? []).find((u) => u.id === id) ?? null;
}

export async function createStaffUser(input: {
  name: string;
  role: "barista" | "admin";
  pinHash: string;
}): Promise<StaffUser> {
  await ensureLoaded();
  const user: StaffUser = {
    id: randomUUID(),
    name: input.name,
    role: input.role,
    pinHash: input.pinHash,
    createdAt: nowIso(),
  };
  memoryStore.staffUsers = [...(memoryStore.staffUsers ?? []), user];
  await persist();
  return user;
}

export async function deactivateStaffUser(id: string): Promise<void> {
  await ensureLoaded();
  const u = (memoryStore.staffUsers ?? []).find((x) => x.id === id);
  if (u) {
    u.deactivatedAt = nowIso();
    await persist();
  }
}

export async function touchStaffLogin(id: string): Promise<void> {
  await ensureLoaded();
  const u = (memoryStore.staffUsers ?? []).find((x) => x.id === id);
  if (u) {
    u.lastLoginAt = nowIso();
    await persist();
  }
}

// --- Audit log ---

export async function appendAudit(entry: AuditLogEntry): Promise<void> {
  await ensureLoaded();
  memoryStore.auditLog = [...(memoryStore.auditLog ?? []), entry];
  // Cap op 10k entries in de file-store — voorkom oneindige groei in dev.
  if (memoryStore.auditLog.length > 10_000) {
    memoryStore.auditLog = memoryStore.auditLog.slice(-10_000);
  }
  await persist();
}

export async function listAudit(opts?: {
  limit?: number;
  sinceIso?: string;
}): Promise<AuditLogEntry[]> {
  await ensureLoaded();
  let items = memoryStore.auditLog ?? [];
  if (opts?.sinceIso) items = items.filter((e) => e.at >= opts.sinceIso!);
  items = [...items].sort((a, b) => b.at.localeCompare(a.at));
  if (opts?.limit) items = items.slice(0, opts.limit);
  return items;
}

// --- E-mail verification ---

export async function createEmailToken(
  token: EmailVerificationToken
): Promise<void> {
  await ensureLoaded();
  memoryStore.emailTokens = [...(memoryStore.emailTokens ?? []), token];
  await persist();
}

export async function consumeEmailToken(
  tokenValue: string
): Promise<EmailVerificationToken | null> {
  await ensureLoaded();
  const list = memoryStore.emailTokens ?? [];
  const idx = list.findIndex((t) => t.token === tokenValue);
  if (idx < 0) return null;
  const tok = list[idx];
  if (tok.consumedAt) return null;
  if (new Date(tok.expiresAt).getTime() < Date.now()) return null;
  tok.consumedAt = nowIso();
  await persist();
  return tok;
}

// --- Referral helpers ---

export async function incrementReferralsCount(
  customerId: string
): Promise<void> {
  await ensureLoaded();
  const rec = memoryStore.customers[customerId];
  if (!rec) return;
  rec.referralsCount = (rec.referralsCount ?? 0) + 1;
  rec.updatedAt = nowIso();
  await persist();
}
