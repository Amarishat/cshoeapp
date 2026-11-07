#!/usr/bin/env node
/**
 * Phase 3 of the customiser shoe optimisation: geometry compression (EXT_meshopt_compression),
 * with optional quantisation (KHR_mesh_quantization).
 *
 *   node scripts/optimize-shoe-geometry.mjs [--out public/models/cshoe-airforce-v4.glb]
 *                                           [--positions float|i16] [--normals float|i16:<bits>|i8]
 *
 * The defaults (--positions i16 --normals i8) reproduce the accepted v4 byte for byte.
 *
 * Reads the Phase 2 model (cshoe-airforce-v3.glb, never changed). Nothing but vertex data
 * encoding changes: same nodes (names, hierarchy, transforms — none are added), meshes,
 * primitives, materials, textures and index lists, and no vertex is reordered.
 *  --positions i16   POSITION as normalised int16, directly: the shoe is in metres and lies
 *                    within ±1, so no rescaling or node transform is needed; step 1/32767 m.
 *  --normals i16:N   NORMAL as normalised int16 at N bits (8–16); i8 as normalised int8.
 * UVs (out of [0,1], rescaled by KHR_texture_transform) and indices are kept exactly.
 * Meshopt is applied in its lossless mode (no filters), so all precision loss is the
 * quantisation above, which the script measures against v3 and reports.
 */
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { NodeIO, VertexLayout } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression, KHRMeshQuantization } from "@gltf-transform/extensions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const root = fileURLToPath(new URL("..", import.meta.url));
const SOURCE = `${root}public/models/cshoe-airforce-v3.glb`;

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const OUT = `${root}${option("--out", "public/models/cshoe-airforce-v4.glb")}`;
const POSITIONS = option("--positions", "i16");
const NORMALS = option("--normals", "i8");
const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exit(1);
};
if (!["float", "i16"].includes(POSITIONS)) fail(`Bad --positions "${POSITIONS}".`);
if (!/^(float|i8|i16:(8|9|1[0-6]))$/.test(NORMALS)) fail(`Bad --normals "${NORMALS}".`);

await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder })
  .setVertexLayout(VertexLayout.SEPARATE);
const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

/** Values in [-1, 1] as normalised ints of the given type, at `bits` of precision. */
function toNormalized(values, Ctor, bits) {
  const full = Ctor === Int8Array ? 127 : 32767;
  const steps = 2 ** (bits - 1) - 1;
  const out = new Ctor(values.length);
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!(v >= -1 && v <= 1)) fail(`Value ${v} is outside [-1, 1].`);
    out[i] = Math.round((Math.round(v * steps) / steps) * full);
  }
  return out;
}

const sourceHash = sha256(SOURCE);
const document = await io.read(SOURCE);
const attributesBySemantic = (semantic) =>
  new Set(document.getRoot().listMeshes().flatMap((m) => m.listPrimitives().map((p) => p.getAttribute(semantic)).filter(Boolean)));

if (POSITIONS === "i16") {
  for (const accessor of attributesBySemantic("POSITION")) {
    accessor.setArray(toNormalized(accessor.getArray(), Int16Array, 16)).setNormalized(true);
  }
}
if (NORMALS !== "float") {
  const [Ctor, bits] = NORMALS === "i8" ? [Int8Array, 8] : [Int16Array, Number(NORMALS.split(":")[1])];
  for (const accessor of attributesBySemantic("NORMAL")) {
    accessor.setArray(toNormalized(accessor.getArray(), Ctor, bits)).setNormalized(true);
  }
}
if (POSITIONS !== "float" || NORMALS !== "float") document.createExtension(KHRMeshQuantization).setRequired(true);
// Lossless meshopt: no filters, so the decoded data is exactly what is stored above.
document
  .createExtension(EXTMeshoptCompression)
  .setRequired(true)
  .setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });

await io.write(OUT, document);

// ---- Verify against v3, from the files on disk ----------------------------------------
if (sha256(SOURCE) !== sourceHash) fail("The v3 model changed.");
const before = await io.read(SOURCE);
const after = await io.read(OUT);

const values = (accessor) => {
  const out = [];
  for (let i = 0, el = []; i < accessor.getCount(); i++) out.push(...accessor.getElement(i, el));
  return out;
};
const errors = { POSITION: 0, NORMAL_degrees: 0 };
const stats = { rotatedTriangleLists: 0 };
/** Triangles as a string, each rotated (winding kept) to start at its smallest index. */
function canonicalTriangles(indices) {
  const out = [];
  for (let i = 0; i < indices.length; i += 3) {
    const t = [indices[i], indices[i + 1], indices[i + 2]];
    const k = t.indexOf(Math.min(...t));
    out.push(`${t[k]},${t[(k + 1) % 3]},${t[(k + 2) % 3]}`);
  }
  return out.join(";");
}
const nodesBefore = before.getRoot().listNodes();
const nodesAfter = after.getRoot().listNodes();
if (nodesBefore.length !== nodesAfter.length) fail("Node count changed.");
for (let n = 0; n < nodesBefore.length; n++) {
  const [a, b] = [nodesBefore[n], nodesAfter[n]];
  // Name, transform, children (by name) and extras: everything but the mesh's vertex data.
  if (a.getName() !== b.getName()) fail(`Node ${n} renamed: ${a.getName()} → ${b.getName()}.`);
  if (a.getMatrix().join() !== b.getMatrix().join()) fail(`Node "${a.getName()}" transform changed.`);
  if (a.listChildren().map((c) => c.getName()).join() !== b.listChildren().map((c) => c.getName()).join()) {
    fail(`Node "${a.getName()}" children changed.`);
  }
  const [meshA, meshB] = [a.getMesh(), b.getMesh()];
  if (!meshA !== !meshB) fail(`Node "${a.getName()}" mesh added or removed.`);
  if (!meshA) continue;
  const [primsA, primsB] = [meshA.listPrimitives(), meshB.listPrimitives()];
  if (meshA.getName() !== meshB.getName() || primsA.length !== primsB.length) fail(`Mesh "${meshA.getName()}" changed.`);
  primsA.forEach((pa, i) => {
    const pb = primsB[i];
    if (pa.getMode() !== pb.getMode()) fail(`"${a.getName()}" primitive mode changed.`);
    if (!pa.getMaterial().equals(pb.getMaterial())) fail(`"${a.getName()}" material changed.`);
    if (pa.getMaterial().getName() !== pb.getMaterial().getName()) fail(`"${a.getName()}" material reassigned.`);
    // Meshopt's triangle codec may rotate a triangle's corners (abc → bca): the same triangle,
    // same winding. Compare each triangle starting from its smallest index.
    const [ia, ib] = [values(pa.getIndices()), values(pb.getIndices())];
    if (ia.length !== ib.length || canonicalTriangles(ia) !== canonicalTriangles(ib)) {
      fail(`"${a.getName()}" triangles changed.`);
    }
    if (ia.join() !== ib.join()) stats.rotatedTriangleLists++;
    if (pa.listSemantics().join() !== pb.listSemantics().join()) fail(`"${a.getName()}" attributes changed.`);
    for (const semantic of pa.listSemantics()) {
      const [x, y] = [values(pa.getAttribute(semantic)), values(pb.getAttribute(semantic))];
      if (x.length !== y.length) fail(`"${a.getName()}" ${semantic} count changed.`);
      if (semantic === "POSITION") {
        for (let k = 0; k < x.length; k++) errors.POSITION = Math.max(errors.POSITION, Math.abs(x[k] - y[k]));
      } else if (semantic === "NORMAL") {
        for (let k = 0; k < x.length; k += 3) {
          const lb = Math.hypot(y[k], y[k + 1], y[k + 2]);
          const dot = (x[k] * y[k] + x[k + 1] * y[k + 1] + x[k + 2] * y[k + 2]) / (Math.hypot(x[k], x[k + 1], x[k + 2]) * lb);
          errors.NORMAL_degrees = Math.max(errors.NORMAL_degrees, (Math.acos(Math.min(1, dot)) * 180) / Math.PI);
        }
      } else if (x.join() !== y.join()) {
        fail(`"${a.getName()}" ${semantic} changed.`);
      }
    }
  });
}
const texturesBefore = before.getRoot().listTextures();
const texturesAfter = after.getRoot().listTextures();
if (!texturesBefore.every((t, i) => t.equals(texturesAfter[i]))) fail("A texture changed.");

console.log(
  JSON.stringify(
    {
      settings: { positions: POSITIONS, normals: NORMALS },
      source: { file: SOURCE, bytes: statSync(SOURCE).size, sha256: sourceHash },
      target: { file: OUT, bytes: statSync(OUT).size, sha256: sha256(OUT) },
      maxPositionErrorMm: Number((errors.POSITION * 1000).toFixed(4)),
      maxNormalErrorDegrees: Number(errors.NORMAL_degrees.toFixed(3)),
      triangleListsWithRotatedCorners: stats.rotatedTriangleLists,
      extensionsUsed: after.getRoot().listExtensionsUsed().map((e) => e.extensionName).sort(),
      extensionsRequired: after.getRoot().listExtensionsRequired().map((e) => e.extensionName).sort(),
    },
    null,
    2,
  ),
);
console.log("✓ Nodes, transforms, meshes, materials, textures, triangles (and winding) and UVs identical to v3.");
