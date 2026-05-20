// Genereert public/og-image.png — de social-share preview (1200x630).
// Usage: node scripts/gen-og-image.mjs

import sharp from "sharp";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const W = 1200;
const H = 630;

async function main() {
  const logoPath = path.join(root, "public", "icons", "logo-512.png");
  const out = path.join(root, "public", "og-image.png");

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f7f1e6"/>
      <stop offset="100%" stop-color="#e8c170"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <text x="60" y="220" font-family="-apple-system, system-ui, sans-serif" font-size="84" font-weight="800" fill="#5b3a1f">Coffee Garden</text>
  <text x="60" y="300" font-family="-apple-system, system-ui, sans-serif" font-size="48" font-weight="500" fill="#3d2817">Digitale stempelkaart</text>
  <text x="60" y="430" font-family="-apple-system, system-ui, sans-serif" font-size="38" font-weight="400" fill="#5b4a3f">Elk 8e drankje gratis ☕</text>
  <text x="60" y="490" font-family="-apple-system, system-ui, sans-serif" font-size="32" font-weight="400" fill="#5b4a3f">Geen app — gewoon in je browser.</text>
</svg>`;

  // Bouw de achtergrond, dan plak het logo rechts.
  const bg = await sharp(Buffer.from(svg)).png().toBuffer();
  let composed = sharp(bg);

  try {
    await fs.access(logoPath);
    const logo = await sharp(logoPath).resize(380, 380).png().toBuffer();
    composed = composed.composite([{ input: logo, top: 125, left: 760 }]);
  } catch {
    // logo nog niet gegenereerd — geen drama, OG zonder logo werkt ook.
  }

  await composed.png({ quality: 92, compressionLevel: 9 }).toFile(out);
  const stat = await fs.stat(out);
  console.log(
    `Wrote ${path.relative(root, out)} (${W}x${H}, ${stat.size} bytes)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
