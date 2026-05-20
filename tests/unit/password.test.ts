import { describe, expect, it } from "vitest";
import {
  hashPassword,
  timingSafeStringEqual,
  verifyPassword,
} from "@/lib/password";

describe("password hashing", () => {
  it("roundtrips a 4-digit PIN", async () => {
    const h = await hashPassword("1234");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("1234", h)).toBe(true);
    expect(await verifyPassword("4321", h)).toBe(false);
  });

  it("returns false for a malformed hash", async () => {
    expect(await verifyPassword("1234", "")).toBe(false);
    expect(await verifyPassword("1234", "not-a-hash")).toBe(false);
    expect(await verifyPassword("1234", "scrypt$bad")).toBe(false);
  });

  it("two hashes of the same password are different (random salt)", async () => {
    const a = await hashPassword("foo");
    const b = await hashPassword("foo");
    expect(a).not.toBe(b);
    expect(await verifyPassword("foo", a)).toBe(true);
    expect(await verifyPassword("foo", b)).toBe(true);
  });
});

describe("timingSafeStringEqual", () => {
  it("returns true for equal strings", () => {
    expect(timingSafeStringEqual("hello", "hello")).toBe(true);
  });
  it("returns false for unequal strings of equal length", () => {
    expect(timingSafeStringEqual("hello", "world")).toBe(false);
  });
  it("returns false for unequal lengths without crashing", () => {
    expect(timingSafeStringEqual("a", "ab")).toBe(false);
    expect(timingSafeStringEqual("longer", "x")).toBe(false);
  });
});
