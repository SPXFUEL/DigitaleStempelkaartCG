// Verwijdert de cream achtergrond uit logo.png en schrijft een transparante PNG.
// Sampled de achtergrondkleur in de hoek en past een soft-alpha chroma-key toe
// zodat de randen van het logo niet kartelen.
//
// Usage: node scripts/strip-logo-bg.mjs
import sharp from "sharp";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "public", "icons", "logo.png");
const dst = path.join(root, "public", "icons", "logo.png"); // overwrite in-place
const backup = path.join(root, "public", "icons", "logo.original.png");

// Maak een backup voor het geval we 'r aan moeten sleutelen
try {
  await fs.access(backup);
  console.log("Backup bestaat al, sla over");
} catch {
  await fs.copyFile(src, backup);
  console.log(`Backup gemaakt: ${path.basename(backup)}`);
}

const { data, info } = await sharp(backup)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height, channels } = info;
console.log(`Source: ${width}x${height}, channels=${channels}`);

// Sample een paar hoeken om de achtergrondkleur te bepalen (gemiddeld)
function sample(x, y) {
  const i = (y * width + x) * channels;
  return [data[i], data[i + 1], data[i + 2]];
}
const samples = [
  sample(0, 0),
  sample(width - 1, 0),
  sample(0, height - 1),
  sample(width - 1, height - 1),
  sample(Math.floor(width / 2), 5),
];
const bgR = Math.round(samples.reduce((a, s) => a + s[0], 0) / samples.length);
const bgG = Math.round(samples.reduce((a, s) => a + s[1], 0) / samples.length);
const bgB = Math.round(samples.reduce((a, s) => a + s[2], 0) / samples.length);
console.log(`Gedetecteerde achtergrond: rgb(${bgR}, ${bgG}, ${bgB})`);

// Soft alpha chroma-key:
//   < distLow  → volledig transparant
//   tussen     → graduele alpha (geen kartelranden)
//   > distHigh → behoud originele alpha
const distLow = 18;
const distHigh = 55;

const buf = Buffer.from(data);
let transparent = 0;
let partial = 0;
let kept = 0;

for (let i = 0; i < buf.length; i += channels) {
  const r = buf[i];
  const g = buf[i + 1];
  const b = buf[i + 2];
  const dr = r - bgR;
  const dg = g - bgG;
  const db = b - bgB;
  const dist = Math.sqrt(dr * dr + dg * dg + db * db);

  if (dist < distLow) {
    buf[i + 3] = 0;
    transparent++;
  } else if (dist < distHigh) {
    // Lineaire alpha-ramp tussen distLow en distHigh
    const t = (dist - distLow) / (distHigh - distLow);
    buf[i + 3] = Math.round(255 * t);
    partial++;
  } else {
    // pixel ver van bg-kleur → laat alpha staan (al 255 door ensureAlpha)
    kept++;
  }
}

const total = transparent + partial + kept;
console.log(
  `Transparant: ${((transparent / total) * 100).toFixed(1)}% · ` +
    `Soft edge: ${((partial / total) * 100).toFixed(1)}% · ` +
    `Behouden: ${((kept / total) * 100).toFixed(1)}%`
);

await sharp(buf, { raw: { width, height, channels } })
  .png({ compressionLevel: 9 })
  .toFile(dst);

const stat = await fs.stat(dst);
console.log(`Geschreven: ${path.basename(dst)} (${stat.size} bytes)`);
