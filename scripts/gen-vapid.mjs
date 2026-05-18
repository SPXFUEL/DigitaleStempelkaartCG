// Genereert een VAPID-keypair + een CRON_SECRET voor de cron-endpoints.
// Output is bedoeld om handmatig in .env.local en Vercel env vars te zetten.
// Usage: node scripts/gen-vapid.mjs
import webpush from "web-push";
import { randomBytes } from "node:crypto";

const keys = webpush.generateVAPIDKeys();
const cronSecret = randomBytes(32).toString("hex");

console.log("# Voeg toe aan .env.local en Vercel env vars:");
console.log("");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:ricardovanrijn2@gmail.com`);
console.log(`CRON_SECRET=${cronSecret}`);
console.log("");
console.log("# Bewaar de PRIVATE key veilig. Public key mag in de browser bundle.");
