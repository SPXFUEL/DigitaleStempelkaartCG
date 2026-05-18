// End-to-end smoke test tegen de live productie-URL.
// Test: enroll → stamp x7 → redeem → birthday-flow → DB-verificatie + cleanup.
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

const cleanupIds = [];
let failed = false;
function fail(msg, extra) {
  console.error(`\n❌ ${msg}`, extra ?? "");
  failed = true;
}

// ============================================================
// Test 1: standaard flow (enroll → 7 stamps → redeem)
// ============================================================
{
  console.log(`Base: ${BASE}\n`);
  console.log("── Test 1: enroll + stamp x7 + redeem ──");

  const customerJar = new Jar();
  const enroll = await call(customerJar, "/api/enroll", {
    method: "POST",
    body: JSON.stringify({ name: `E2E ${Date.now()}` }),
  });
  if (enroll.status !== 200) fail("enroll failed", enroll);
  else {
    const customerId = enroll.body.customer.id;
    cleanupIds.push(customerId);
    console.log(`  ✓ Enroll: ${customerId.slice(0, 8)}`);

    const staffJar = new Jar();
    const login = await call(staffJar, "/api/staff/login", {
      method: "POST",
      body: JSON.stringify({ pin: STAFF_PIN }),
    });
    if (login.status !== 200) fail("staff login failed", login);

    for (let i = 1; i <= 7; i++) {
      const r = await call(staffJar, "/api/stamp", {
        method: "POST",
        body: JSON.stringify({ customerId }),
      });
      if (r.status !== 200) fail(`stamp ${i} failed`, r);
    }
    console.log(`  ✓ 7 stempels gezet`);

    const redeem = await call(staffJar, "/api/redeem", {
      method: "POST",
      body: JSON.stringify({ customerId }),
    });
    if (redeem.status !== 200) fail("redeem failed", redeem);
    else
      console.log(
        `  ✓ Redeem: stamps=${redeem.body.customer.stamps}, totalRewards=${redeem.body.customer.totalRewards}, totalDrinks=${redeem.body.customer.totalDrinks}`
      );
  }
}

// ============================================================
// Test 2: verjaardags-tractatie
// ============================================================
{
  console.log("\n── Test 2: birthday flow ──");

  // Bepaal "vandaag" in Europe/Amsterdam (zelfde logica als server)
  const todayAms = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  // Pak een birthday: zelfde MM-DD maar 30 jaar terug (zodat het echt 'vandaag jarig' is)
  const yyyy = parseInt(todayAms.slice(0, 4), 10) - 30;
  const birthday = `${yyyy}${todayAms.slice(4)}`;
  console.log(`  Today (AMS): ${todayAms}, birthday: ${birthday}`);

  const customerJar = new Jar();
  const enroll = await call(customerJar, "/api/enroll", {
    method: "POST",
    body: JSON.stringify({
      name: `Birthday ${Date.now()}`,
      birthday,
    }),
  });
  if (enroll.status !== 200) {
    fail("birthday enroll failed", enroll);
  } else {
    const c = enroll.body.customer;
    cleanupIds.push(c.id);
    console.log(`  ✓ Enroll: birthday=${c.birthday}, birthdayActive=${c.birthdayActive}`);
    if (c.birthday !== birthday) fail("birthday niet opgeslagen", c);
    if (!c.birthdayActive) fail("birthdayActive zou true moeten zijn", c);

    // Staff redeems birthday
    const staffJar = new Jar();
    await call(staffJar, "/api/staff/login", {
      method: "POST",
      body: JSON.stringify({ pin: STAFF_PIN }),
    });

    const before = await call(staffJar, `/api/staff/customer/${c.id}`);
    if (!before.body.customer?.birthdayActive) {
      fail("staff lookup zegt birthdayActive=false", before);
    } else {
      console.log(`  ✓ Staff ziet birthdayActive=true`);
    }

    const redeem = await call(staffJar, "/api/redeem-birthday", {
      method: "POST",
      body: JSON.stringify({ customerId: c.id }),
    });
    if (redeem.status !== 200) {
      fail("birthday redeem failed", redeem);
    } else {
      const updated = redeem.body.customer;
      console.log(
        `  ✓ Birthday redeem: birthdayActive=${updated.birthdayActive}, totalDrinks=${updated.totalDrinks}`
      );
      if (updated.birthdayActive) fail("birthdayActive moet false zijn na redeem", updated);
      if (updated.totalDrinks !== 1) fail("totalDrinks moet 1 zijn", updated);

      // Tweede poging zou moeten falen
      const second = await call(staffJar, "/api/redeem-birthday", {
        method: "POST",
        body: JSON.stringify({ customerId: c.id }),
      });
      if (second.status === 200) {
        fail("tweede birthday redeem zou moeten falen", second);
      } else {
        console.log(`  ✓ Tweede redeem geweigerd (status ${second.status})`);
      }
    }

    // Verify event in DB
    const { data: events } = await sb
      .from("stamp_events")
      .select("type")
      .eq("customer_id", c.id);
    const types = events?.map((e) => e.type).join(",") ?? "";
    console.log(`  ✓ Event log: ${types}`);
    if (!types.includes("birthday")) fail("birthday event niet opgeslagen", events);
  }
}

// ============================================================
// Cleanup
// ============================================================
console.log(`\n── Cleanup ${cleanupIds.length} test-klant(en) ──`);
for (const id of cleanupIds) {
  await sb.from("customers").delete().eq("id", id);
}
console.log(`  ✓ Klaar`);

console.log(failed ? "\n❌ E2E-test gefaald" : "\n✅ E2E-test geslaagd");
process.exit(failed ? 1 : 0);
