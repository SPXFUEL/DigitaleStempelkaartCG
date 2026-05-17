import { cookies } from "next/headers";

const CUSTOMER_COOKIE = "cg_customer_id";
const STAFF_COOKIE = "cg_staff_session";
const ONE_YEAR = 60 * 60 * 24 * 365;
const ONE_DAY = 60 * 60 * 24;

export async function getCustomerCookie(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(CUSTOMER_COOKIE)?.value ?? null;
}

export async function setCustomerCookie(customerId: string): Promise<void> {
  const jar = await cookies();
  jar.set(CUSTOMER_COOKIE, customerId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });
}

export async function clearCustomerCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(CUSTOMER_COOKIE);
}

export async function isStaffAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  return jar.get(STAFF_COOKIE)?.value === "ok";
}

export async function setStaffCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(STAFF_COOKIE, "ok", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_DAY,
  });
}

export async function clearStaffCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(STAFF_COOKIE);
}

export function getStaffPin(): string {
  return process.env.STAFF_PIN || "1234";
}
