import { describe, expect, it } from "vitest";
import {
  bucketByDay,
  computeKpis,
  computeUpcomingBirthdays,
  recentRedeems,
} from "@/lib/dashboard";
import type { Customer, StampEvent } from "@/lib/types";

function customer(p: Partial<Customer>): Customer {
  return {
    id: p.id ?? "x",
    name: p.name ?? "X",
    stamps: 0,
    totalDrinks: 0,
    totalRewards: 0,
    rewardAvailable: false,
    birthdayActive: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...p,
  };
}

describe("bucketByDay", () => {
  it("creates a bucket per day even when no events fall in that day", () => {
    const buckets = bucketByDay([], 7);
    expect(buckets).toHaveLength(7);
    for (const b of buckets) {
      expect(b.stamps).toBe(0);
      expect(b.rewards).toBe(0);
      expect(b.birthdays).toBe(0);
    }
  });
});

describe("computeKpis", () => {
  it("counts new customers in last 7 days", () => {
    const today = new Date();
    const old = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const customers = [
      customer({ id: "a", createdAt: today.toISOString() }),
      customer({ id: "b", createdAt: old.toISOString() }),
    ];
    const kpis = computeKpis(2, [], customers);
    expect(kpis.totalCustomers).toBe(2);
    expect(kpis.newCustomersLast7Days).toBe(1);
  });
});

describe("computeUpcomingBirthdays", () => {
  it("includes customers within window", () => {
    const today = new Date();
    const md = today.toISOString().slice(5, 10);
    const cust = customer({ birthday: `1990-${md}` });
    const result = computeUpcomingBirthdays([cust], 7);
    expect(result).toHaveLength(1);
    expect(result[0].daysUntil).toBe(0);
  });

  it("excludes customers outside the window", () => {
    const today = new Date();
    const far = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const md = far.toISOString().slice(5, 10);
    const cust = customer({ birthday: `1990-${md}` });
    const result = computeUpcomingBirthdays([cust], 7);
    expect(result).toHaveLength(0);
  });
});

describe("recentRedeems", () => {
  it("returns most recent redemptions only", () => {
    const a = customer({ id: "a" });
    const b = customer({ id: "b" });
    const map = new Map([
      [a.id, a],
      [b.id, b],
    ]);
    const events: StampEvent[] = [
      { customerId: "a", type: "stamp", at: "2026-01-01T10:00:00Z" },
      { customerId: "a", type: "redeem", at: "2026-01-02T10:00:00Z" },
      { customerId: "b", type: "birthday", at: "2026-01-03T10:00:00Z" },
    ];
    const result = recentRedeems(events, map, 5);
    expect(result.map((r) => r.type)).toEqual(["birthday", "redeem"]);
  });
});
