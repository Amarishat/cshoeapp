#!/usr/bin/env node
/**
 * Phase 2 of the customiser shoe optimisation: its textures as WebP (EXT_texture_webp).
 *
 *   node scripts/optimize-shoe-textures.mjs --survey
 *   node scripts/optimize-shoe-textures.mjs [--out public/models/cshoe-airforce-v3.glb]
 *                                           [--default q90] [--image Image_0=1024:lossless …]
 *
 * Reads the Phase 1 model (cshoe-airforce-v2.glb, never changed) and re-encodes each image
 * per its spec, "[size:]mode":
 *   size      longest side in px (resized with Lanczos, in the image's own values, so normal
 *             maps aren't gamma-shifted); omitted = unchanged
 *   mode      keep (leave the image as it is), lossless, near<N> (near-lossless, N = 0–100,
 *             lower = smaller), or q<N> (lossy quality N, with sharp's smart chroma subsampling)
 * Only image data changes: KHR_texture_transform, samplers, materials, meshes and node names
 * stay as they are, and the script fails unless the written model is identical to v2 apart
 * from its images. --survey prints each image's size under several specs and writes nothing.
 */
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { NodeIO, VertexLayout } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTTextureWebP } from "@gltf-transform/extensions";

const root = fileURLToPath(new URL("..", import.meta.url));
const SOURCE = `${root}public/models/cshoe-airforce-v2.glb`;

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const OUT = option("--out") ? `${root}${option("--out")}` : `${root}public/models/cshoe-airforce-v3.glb`;
const DEFAULT_SPEC = option("--default") ?? "keep";
/** Image name → spec, from each --image Name=spec. */
const SPECS = new Map(
  args.flatMap((arg, i) => (args[i - 1] === "--image" ? [arg.split("=")] : [])).map(([name, spec]) => [name, spec]),
);

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).setVertexLayout(VertexLayout.SEPARATE);
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

function parseSpec(spec) {
  const match = /^(?:(\d+):)?(keep|lossless|near(\d+)|q(\d+))$/.exec(spec);
  if (!match) fail(`Bad spec "${spec}".`);
  const [, size, mode, near, quality] = match;
  return { size: size && Number(size), mode: mode.replace(/\d+$/, ""), near: near && Number(near), quality: quality && Number(quality) };
}

/** `image` re-encoded as WebP per `spec`, or null to keep it. */
async function encode(image, spec) {
  const { size, mode, near, quality } = parseSpec(spec);
  if (mode === "keep") return null;
  let pipeline = sharp(image);
  if (size) pipeline = pipeline.resize(size, size, { fit: "inside", kernel: "lanczos3" });
  const webp =
    mode === "lossless"
      ? { lossless: true, effort: 6 }
      : mode === "near"
        ? { nearLossless: true, quality: near, effort: 6 }
        : { quality, smartSubsample: true, effort: 6 };
  return new Uint8Array(await pipeline.webp(webp).toBuffer());
}

/** Largest channel difference and PSNR between two images of the same size. */
async function compare(a, b) {
  const [x, y] = await Promise.all([a, b].map((img) => sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true })));
  if (x.info.width !== y.info.width || x.info.height !== y.info.height) return null;
  let max = 0;
  let squared = 0;
  for (let i = 0; i < x.data.length; i++) {
    const d = Math.abs(x.data[i] - y.data[i]);
    max = Math.max(max, d);
    squared += d * d;
  }
  const mse = squared / x.data.length;
  return { maxDelta: max, psnr: mse === 0 ? Infinity : Number((10 * Math.log10((255 * 255) / mse)).toFixed(1)) };
}

const sourceHash = sha256(SOURCE);
const document = await io.read(SOURCE);
const textures = document.getRoot().listTextures();

if (args.includes("--survey")) {
  const specs = ["lossless", "near80", "near60", "q95", "q90", "q85"];
  for (const texture of textures) {
    const image = texture.getImage();
    const { width, height } = await sharp(image).metadata();
    const extra = width > 1024 ? ["1024:lossless", "1024:near60", "1024:q95", "1024:q90"] : [];
    console.log(`\n${texture.getName()}  ${texture.getMimeType()} ${width}×${height}  ${image.byteLength} B`);
    for (const spec of [...specs, ...extra]) {
      const out = await encode(image, spec);
      const quality = await compare(image, out);
      console.log(
        `  ${spec.padEnd(14)} ${String(out.byteLength).padStart(9)} B  ${((100 * out.byteLength) / image.byteLength).toFixed(0).padStart(4)}%` +
          (quality ? `  max Δ ${quality.maxDelta}, PSNR ${quality.psnr} dB` : ""),
      );
    }
  }
  process.exit(0);
}

// Re-encode.
const changes = [];
for (const texture of textures) {
  const spec = SPECS.get(texture.getName()) ?? DEFAULT_SPEC;
  const before = texture.getImage();
  const after = await encode(before, spec);
  const meta = await sharp(before).metadata();
  if (!after) {
    changes.push({ image: texture.getName(), spec, from: `${texture.getMimeType()} ${meta.width}×${meta.height} ${before.byteLength} B`, to: "kept" });
    continue;
  }
  const out = await sharp(after).metadata();
  const quality = await compare(before, after);
  texture.setImage(after).setMimeType("image/webp");
  changes.push({
    image: texture.getName(),
    spec,
    from: `${meta.format} ${meta.width}×${meta.height} ${before.byteLength} B`,
    to: `webp ${out.width}×${out.height} ${after.byteLength} B`,
    ...(quality && { maxDelta: quality.maxDelta, psnr: quality.psnr }),
  });
}
if (textures.some((t) => t.getMimeType() === "image/webp")) {
  // No fallback image: every browser the app supports decodes WebP.
  document.createExtension(EXTTextureWebP).setRequired(true);
}
await io.write(OUT, document);

// Verify: v2 untouched, and the written model identical to v2 apart from image data.
if (sha256(SOURCE) !== sourceHash) fail("The v2 model changed.");
const original = await io.read(SOURCE);
const written = await io.read(OUT);
const originalTextures = new Map(original.getRoot().listTextures().map((t) => [t.getName(), t]));
const writtenTextures = written.getRoot().listTextures();
if (writtenTextures.length !== originalTextures.size) fail("The number of textures changed.");
for (const texture of writtenTextures) {
  const match = originalTextures.get(texture.getName());
  if (!match) fail(`Unexpected texture "${texture.getName()}".`);
  // Put v2's image back (in memory only), so everything else can be compared exactly.
  texture.setImage(match.getImage()).setMimeType(match.getMimeType());
}
const sceneRoot = (doc) => doc.getRoot().listScenes()[0].listChildren();
const [a, b] = [sceneRoot(original), sceneRoot(written)];
if (a.length !== b.length || !a.every((node, i) => node.equals(b[i]))) fail("Something besides the images changed.");

console.table(changes);
console.log(
  JSON.stringify(
    {
      source: { file: SOURCE, bytes: statSync(SOURCE).size, sha256: sourceHash },
      target: { file: OUT, bytes: statSync(OUT).size, sha256: sha256(OUT) },
      extensionsUsed: written.getRoot().listExtensionsUsed().map((e) => e.extensionName).sort(),
      extensionsRequired: written.getRoot().listExtensionsRequired().map((e) => e.extensionName).sort(),
    },
    null,
    2,
  ),
);
console.log("✓ Only image data changed; everything else is identical to v2.");
