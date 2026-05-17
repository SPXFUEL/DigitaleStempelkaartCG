import sharp from "sharp";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "public", "icons", "logo.png");
const outDir = path.join(root, "public", "icons");

const targets = [
  { name: "logo-192.png", size: 192 },
  { name: "logo-512.png", size: 512 },
  { name: "logo-apple.png", size: 180 },
];

async function main() {
  await fs.access(src);
  const meta = await sharp(src).metadata();
  console.log(
    `Source: ${path.basename(src)} (${meta.width}x${meta.height}, ${(await fs.stat(src)).size} bytes)`
  );
  for (const t of targets) {
    const out = path.join(outDir, t.name);
    await sharp(src)
      .resize(t.size, t.size, { fit: "contain", background: { r: 247, g: 233, b: 208, alpha: 1 } })
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(out);
    const stat = await fs.stat(out);
    console.log(`Wrote ${t.name} (${t.size}x${t.size}, ${stat.size} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
