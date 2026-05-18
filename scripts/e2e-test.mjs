// End-to-end smoke test tegen de live productie-URL.
// Test: enroll → stamp via staff → redeem → verify persistentie via Supabase
// Usage: node scripts/e2e-test.mjs
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.E2E_BASE || "https://digitalestempelkaartcg.vercel.app";
const STAFF_PIN = process.env.E2E_STAFF_PIN || "2581";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Simple cookie jar
class Jar {
  constructor() {
    this.store = new Map();
  }
  apply(setCookies) {
    for (const sc of setCookies) {
      const [pair] = sc.split(";");
      const [k, v] = pair.split("=");
      if (k && v !== undefined) this.store.set(k.trim(), v.trim());
    }
  }
  header() {
    return [...this.store.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

async function call(jar, path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(jar.header() ? { cookie: jar.header() } : {}),
      ...(init.headers || {}),
    },
    redirect: "manual",
  });
  const setCookies = res.headers.getSetCookie?.() ?? [];
  jar.apply(setCookies);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, body: json ?? text };
}

const testName = `E2E ${new Date().toISOString().slice(11, 19)}`;
console.log(`Base: ${BASE}`);
console.log(`Test customer name: ${testName}\n`);

// 1. Enroll als klant
const customerJar = new Jar();
const enroll = await call(customerJar, "/api/enroll", {
  method: "POST",
  body: JSON.stringify({ name: testName }),
});
if (enroll.status !== 200) {
  console.error("FAIL enroll:", enroll);
  process.exit(1);
}
const customerId = enroll.body.customer.id;
console.log(`✓ Enroll: ${customerId} (status ${enroll.status})`);

// 2. Verify in Supabase
const { data: row, error } = await sb
  .from("customers")
  .select()
  .eq("id", customerId)
  .single();
if (error || !row) {
  console.error("FAIL persistence check:", error?.message);
  process.exit(1);
}
console.log(`✓ Supabase row exists: stamps=${row.stamps}, name="${row.name}"`);

// 3. Staff login
const staffJar = new Jar();
const login = await call(staffJar, "/api/staff/login", {
  method: "POST",
  body: JSON.stringify({ pin: STAFF_PIN }),
});
if (login.status !== 200) {
  console.error("FAIL staff login:", login);
  process.exit(1);
}
console.log(`✓ Staff login OK`);

// 4. Add 7 stamps
for (let i = 1; i <= 7; i++) {
  const r = await call(staffJar, "/api/stamp", {
    method: "POST",
    body: JSON.stringify({ customerId }),
  });
  if (r.status !== 200) {
    console.error(`FAIL stamp ${i}:`, r);
    process.exit(1);
  }
  process.stdout.write(`✓ Stamp ${i}/7 (stamps=${r.body.customer.stamps}, reward=${r.body.customer.rewardAvailable}) `);
}
console.log("");

// 5. Redeem
const redeem = await call(staffJar, "/api/redeem", {
  method: "POST",
  body: JSON.stringify({ customerId }),
});
if (redeem.status !== 200) {
  console.error("FAIL redeem:", redeem);
  process.exit(1);
}
console.log(
  `✓ Redeem: stamps=${redeem.body.customer.stamps}, totalRewards=${redeem.body.customer.totalRewards}, totalDrinks=${redeem.body.customer.totalDrinks}`
);

// 6. Verify final state in Supabase
const { data: finalRow } = await sb
  .from("customers")
  .select()
  .eq("id", customerId)
  .single();
const { data: events } = await sb
  .from("stamp_events")
  .select("type")
  .eq("customer_id", customerId)
  .order("at", { ascending: true });
console.log(
  `✓ Final DB state: stamps=${finalRow.stamps}, total_drinks=${finalRow.total_drinks}, total_rewards=${finalRow.total_rewards}`
);
console.log(`✓ Event log: ${events.map((e) => e.type).join(", ")}`);

// 7. Cleanup test customer
await sb.from("customers").delete().eq("id", customerId);
console.log("✓ Cleaned up test customer\n");

console.log("✅ End-to-end test passed");
