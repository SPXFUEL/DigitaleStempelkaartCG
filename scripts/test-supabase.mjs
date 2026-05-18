// Quick connectivity test for Supabase from Node (simulates server-side use).
// Usage: node scripts/test-supabase.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing env vars. Source .env.local first or set them inline.");
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log("Testing customers table...");
const customers = await sb.from("customers").select("id").limit(1);
if (customers.error) {
  console.error("FAIL customers:", customers.error.message);
  process.exit(1);
}
console.log(`  ✓ customers table OK (${customers.data.length} rows preview)`);

console.log("Testing stamp_events table...");
const events = await sb.from("stamp_events").select("id").limit(1);
if (events.error) {
  console.error("FAIL stamp_events:", events.error.message);
  process.exit(1);
}
console.log(`  ✓ stamp_events table OK (${events.data.length} rows preview)`);

console.log("\nTesting insert + cleanup...");
const ins = await sb
  .from("customers")
  .insert({ name: "Connectivity Test" })
  .select()
  .single();
if (ins.error) {
  console.error("FAIL insert:", ins.error.message);
  process.exit(1);
}
console.log(`  ✓ insert OK: ${ins.data.id}`);

const del = await sb.from("customers").delete().eq("id", ins.data.id);
if (del.error) {
  console.error("FAIL delete:", del.error.message);
  process.exit(1);
}
console.log("  ✓ delete OK");

console.log("\n✅ Supabase connectivity + schema verified");
