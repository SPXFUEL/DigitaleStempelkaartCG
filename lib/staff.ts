/**
 * Per-barista accounts. PINs worden scrypt-hashed opgeslagen, login gaat
 * via `verifyPin` met een constant-time check.
 *
 * Account-creation gebeurt via /api/staff/users (admin-only). De allereerste
 * admin-account wordt aangemaakt door de seed-flow: zolang er 0 staff-users
 * zijn, accepteert /api/staff/login óók de legacy gedeelde PIN, zodat je nooit
 * uit je eigen pand wordt buiten gesloten.
 */

import {
  createStaffUser as storeCreate,
  deactivateStaffUser as storeDeactivate,
  getStaffUser,
  listStaffUsers as storeList,
  touchStaffLogin,
} from "./store";
import { hashPassword, verifyPassword } from "./password";
import type { StaffUser } from "./types";

export interface StaffLoginResult {
  ok: boolean;
  user?: StaffUser;
  /** "no_users" = geen accounts ingeschreven (fallback naar legacy PIN). */
  reason?: "no_users" | "invalid" | "deactivated";
}

export async function listStaff(): Promise<StaffUser[]> {
  return storeList();
}

export async function createStaff(input: {
  name: string;
  role: "barista" | "admin";
  pin: string;
}): Promise<StaffUser> {
  if (!/^\d{4,8}$/.test(input.pin)) {
    throw new Error("PIN moet 4–8 cijfers zijn");
  }
  if (input.name.trim().length < 2) {
    throw new Error("Naam minimaal 2 karakters");
  }
  const pinHash = await hashPassword(input.pin);
  return storeCreate({
    name: input.name.trim(),
    role: input.role,
    pinHash,
  });
}

export async function deactivateStaff(id: string): Promise<void> {
  await storeDeactivate(id);
}

/**
 * Vind het user-account met deze PIN. We hashen niet één keer en zoeken
 * op hash (PIN-collisions in een DB met 4-cijfer PINs zijn waarschijnlijk!),
 * maar lopen door alle actieve accounts en doen een constant-time check.
 * Met ≤20 baristas is dat ~1-2s totaal — prima voor login.
 *
 * In de praktijk is N klein, en deze loop blokkeert geen requests omdat
 * scrypt async is en de event-loop niet blokkeert.
 */
export async function verifyPin(pin: string): Promise<StaffLoginResult> {
  if (!/^\d+$/.test(pin)) return { ok: false, reason: "invalid" };
  const users = await storeList();
  const active = users.filter((u) => !u.deactivatedAt);
  if (active.length === 0) return { ok: false, reason: "no_users" };

  // Run alle compares parallel — scrypt is async, dus dat schaalt.
  const results = await Promise.all(
    active.map(async (u) => ({ u, ok: await verifyPassword(pin, u.pinHash) }))
  );
  const winner = results.find((r) => r.ok);
  if (!winner) return { ok: false, reason: "invalid" };

  await touchStaffLogin(winner.u.id).catch(() => {});
  return {
    ok: true,
    user: { ...winner.u, lastLoginAt: new Date().toISOString() },
  };
}

export async function getStaff(id: string): Promise<StaffUser | null> {
  return getStaffUser(id);
}
