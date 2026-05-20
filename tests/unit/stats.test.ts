import { describe, expect, it } from "vitest";
import { computeStats } from "@/lib/stats";
import type { Customer, StampEvent } from "@/lib/types";

function mkCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "abc",
    name: "Test",
    stamps: 0,
    totalDrinks: 0,
    totalRewards: 0,
    rewardAvailable: false,
    birthdayActive: false,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function mkEvent(at: Date, type: StampEvent["type"] = "stamp"): StampEvent {
  return { customerId: "abc", type, at: at.toISOString() };
}

describe("computeStats", () => {
  it("returns zeros for empty events", () => {
    const s = computeStats(mkCustomer(), []);
    expect(s.totalDrinks).toBe(0);
    expect(s.weekStreak).toBe(0);
    expect(s.favoriteDay).toBeNull();
    expect(s.lastVisitAt).toBeNull();
  });

  it("computes daysAsMember", () => {
    const created = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const s = computeStats(
      mkCustomer({ createdAt: created.toISOString() }),
      []
    );
    expect(s.daysAsMember).toBeGreaterThanOrEqual(89);
    expect(s.daysAsMember).toBeLessThanOrEqual(91);
  });

  it("computes savedEur from totalRewards", () => {
    const s = computeStats(mkCustomer({ totalRewards: 3 }), []);
    // ASSUMED_DRINK_PRICE = 4
    expect(s.savedEur).toBe(12);
  });

  it("favoriteDay requires 5+ visits", () => {
    const now = new Date();
    const events = Array.from({ length: 4 }, (_, i) =>
      mkEvent(new Date(now.getTime() - i * 24 * 60 * 60 * 1000))
    );
    expect(computeStats(mkCustomer(), events).favoriteDay).toBeNull();
  });

  it("week streak counts consecutive weeks ending this/last week", () => {
    const now = new Date();
    const events = [
      mkEvent(now), // deze week
      mkEvent(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)), // vorige week
      mkEvent(new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)), // 2 weken terug
    ];
    const s = computeStats(mkCustomer(), events);
    expect(s.weekStreak).toBeGreaterThanOrEqual(3);
  });
});
