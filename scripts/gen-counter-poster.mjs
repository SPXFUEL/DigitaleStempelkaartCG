// Genereert een A6 toonbank-poster met QR-code die naar je domein wijst.
// Output: public/print/toonbank-qr.png (1240x1748 = A6 @ 300dpi)
// Usage: BASE_URL=https://stempel.coffeegarden.nl node scripts/gen-counter-poster.mjs

import sharp from "sharp";
import QRCode from "qrcode";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl =
  process.env.BASE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  "https://stempel.coffeegarden.nl";

const A6_WIDTH = 1240;
const A6_HEIGHT = 1748;
const QR_SIZE = 800;

async function main() {
  const outDir = path.join(root, "public", "print");
  await fs.mkdir(outDir, { recursive: true });

  // Genereer een hoge-kwaliteit QR
  const qrBuffer = await QRCode.toBuffer(baseUrl, {
    type: "png",
    width: QR_SIZE,
    margin: 2,
    color: { dark: "#2a1a10", light: "#ffffff" },
    errorCorrectionLevel: "H",
  });

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${A6_WIDTH}" height="${A6_HEIGHT}">
  <rect width="100%" height="100%" fill="#f7f1e6"/>
  <text x="50%" y="200" font-family="-apple-system, system-ui, sans-serif" font-size="64" font-weight="700" fill="#5b3a1f" text-anchor="middle">Coffee Garden</text>
  <text x="50%" y="260" font-family="-apple-system, system-ui, sans-serif" font-size="32" font-weight="500" fill="#5b4a3f" text-anchor="middle">Digitale stempelkaart</text>
  <rect x="${(A6_WIDTH - QR_SIZE) / 2 - 30}" y="${(A6_HEIGHT - QR_SIZE) / 2 - 30}" width="${QR_SIZE + 60}" height="${QR_SIZE + 60}" rx="40" fill="#ffffff" stroke="#e8dcc6" stroke-width="3"/>
  <text x="50%" y="${A6_HEIGHT - 280}" font-family="-apple-system, system-ui, sans-serif" font-size="44" font-weight="700" fill="#5b3a1f" text-anchor="middle">Scan mij ☕</text>
  <text x="50%" y="${A6_HEIGHT - 220}" font-family="-apple-system, system-ui, sans-serif" font-size="28" font-weight="400" fill="#5b4a3f" text-anchor="middle">Elk 8e drankje gratis</text>
  <text x="50%" y="${A6_HEIGHT - 160}" font-family="-apple-system, system-ui, sans-serif" font-size="24" font-weight="400" fill="#5b4a3f" text-anchor="middle">${baseUrl.replace(/^https?:\/\//, "")}</text>
</svg>`;

  const out = path.join(outDir, "toonbank-qr.png");
  await sharp(Buffer.from(svg))
    .composite([
      {
        input: qrBuffer,
        top: (A6_HEIGHT - QR_SIZE) / 2,
        left: (A6_WIDTH - QR_SIZE) / 2,
      },
    ])
    .png({ quality: 92, compressionLevel: 9 })
    .toFile(out);

  const stat = await fs.stat(out);
  console.log(
    `Wrote ${path.relative(root, out)} (${A6_WIDTH}x${A6_HEIGHT}, ${stat.size} bytes)`
  );
  console.log(`QR wijst naar: ${baseUrl}`);
  console.log(
    "Print 'm op A6 (105×148 mm), of ga vanuit hier naar PDF in je editor."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
