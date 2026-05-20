import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetAll,
  checkLockout,
  clearFailures,
  recordFailure,
  tryConsume,
} from "@/lib/rate-limit";

describe("rate-limit", () => {
  beforeEach(() => {
    __resetAll();
  });

  it("allows up to max failures, then locks out", () => {
    const key = "ip:1.2.3.4";
    for (let i = 1; i <= 4; i++) {
      const s = recordFailure(key, 5, 300, 60);
      expect(s.allowed).toBe(true);
      expect(s.count).toBe(i);
    }
    const s5 = recordFailure(key, 5, 300, 60);
    expect(s5.allowed).toBe(false);
    expect(s5.count).toBe(5);
    expect(s5.retryAfterSec).toBeGreaterThan(0);
  });

  it("clearFailures resets", () => {
    const key = "ip:9.9.9.9";
    recordFailure(key, 5, 300, 60);
    recordFailure(key, 5, 300, 60);
    clearFailures(key);
    const status = checkLockout(key, 5, 300);
    expect(status.allowed).toBe(true);
    expect(status.count).toBe(0);
  });

  it("tryConsume allows one then blocks within interval", () => {
    expect(tryConsume("stamp:x", 30)).toBe(true);
    expect(tryConsume("stamp:x", 30)).toBe(false);
    expect(tryConsume("stamp:other", 30)).toBe(true);
  });

  it("tryConsume with interval=0 always allows", () => {
    expect(tryConsume("stamp:a", 0)).toBe(true);
    expect(tryConsume("stamp:a", 0)).toBe(true);
    expect(tryConsume("stamp:a", 0)).toBe(true);
  });
});
