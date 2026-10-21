import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const source = path.join(root, "output/portfolio-paintings-2026-10-20");
const manifest = JSON.parse(await fs.readFile(path.join(source, "manifest.json"), "utf8"));
const destination = path.join(root, "public/portfolio/artworks");
await fs.mkdir(destination, { recursive: true });
const assets = {};
let sourceBytes = 0, galleryBytes = 0, detailBytes = 0;
if (manifest.artworks.length !== 49) throw new Error("Expected 49 reviewed paintings");
for (const artwork of manifest.artworks) {
  if (artwork.review.verdict !== "pass") throw new Error(`Unreviewed painting: ${artwork.id}`);
  const input = await fs.readFile(path.join(source, artwork.finalFile));
  if (createHash("sha256").update(input).digest("hex") !== artwork.image.sha256)
    throw new Error(`Painting source changed: ${artwork.id}`);
  const gallery = `${artwork.id}.gallery.webp`, detail = `${artwork.id}.detail.webp`;
  const small = await sharp(input).resize(742, 530, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 88, effort: 5 }).toFile(path.join(destination, gallery));
  const large = await sharp(input).webp({ quality: 90, effort: 5 }).toFile(path.join(destination, detail));
  assets[artwork.id] = {
    gallery: `/portfolio/artworks/${gallery}`,
    detail: `/portfolio/artworks/${detail}`,
    width: 1484, height: 1060,
    alt: `${artwork.project}: ${artwork.symbol} (${artwork.style})`,
    style: artwork.style,
    sourceSha256: artwork.image.sha256,
  };
  sourceBytes += input.length; galleryBytes += small.size; detailBytes += large.size;
}
await fs.writeFile(path.join(root, "src/data/painting-assets.json"), JSON.stringify(assets, null, 2) + "\n");
await fs.writeFile(path.join(destination, "sizes.json"), JSON.stringify({ count: 49, sourceBytes, galleryBytes, detailBytes }, null, 2) + "\n");
console.log(JSON.stringify({ count: 49, sourceBytes, galleryBytes, detailBytes }));
