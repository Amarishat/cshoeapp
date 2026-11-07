#!/usr/bin/env node
/**
 * Builds the optimised customiser shoe from the original model, which is never changed.
 *
 *   node scripts/optimize-shoe.mjs
 *
 * Phase 1 (this step): remove the hidden duplicate copy of the shoe.
 * The original holds two exactly overlapping copies (see components/customizer/shoeModel.ts):
 *  - copy A, under "shoe_Scene_Node" (Avatar + Cloth): the one customers see, kept unchanged;
 *  - copy B, the scene roots "Avatar.002" and "Cloth.002": hidden behind copy A (proved by
 *    scripts/shoe-baseline.mjs), removed with everything only it used.
 * No join, flatten, instance, palette, simplify or compression. The script refuses to run if
 * the model's structure isn't what's described here, or if copy B shares anything with copy A,
 * and it fails unless copy A in the written file is deeply identical to copy A in the original.
 */
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { NodeIO, Root, VertexLayout } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const root = fileURLToPath(new URL("..", import.meta.url));
const SOURCE = `${root}public/models/cshoe-airforce-clean.glb`;
const TARGET = `${root}public/models/cshoe-airforce-v2.glb`;

const KEEP_ROOT = "shoe_Scene_Node";
const REMOVE_ROOTS = ["Avatar.002", "Cloth.002"];

// Every extension registered, so none (KHR_texture_transform, KHR_materials_specular) is dropped
// on write. Separate (not interleaved) vertex buffers, as the original.
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).setVertexLayout(VertexLayout.SEPARATE);

const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

function subtree(node, out = new Set()) {
  out.add(node);
  for (const child of node.listChildren()) subtree(child, out);
  return out;
}

/** The meshes, vertex attributes, index lists and materials drawn by `nodes`. */
function resources(nodes) {
  const meshes = new Set();
  const attributes = new Set();
  const indices = new Set();
  const materials = new Set();
  for (const node of nodes) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    meshes.add(mesh);
    for (const primitive of mesh.listPrimitives()) {
      for (const accessor of primitive.listAttributes()) attributes.add(accessor);
      if (primitive.getIndices()) indices.add(primitive.getIndices());
      if (primitive.getMaterial()) materials.add(primitive.getMaterial());
    }
  }
  return { meshes, attributes, indices, materials };
}

function sceneRoots(document) {
  const scenes = document.getRoot().listScenes();
  if (scenes.length !== 1) fail(`Expected one scene, found ${scenes.length}.`);
  return scenes[0].listChildren();
}

function stats(document) {
  const meshes = document.getRoot().listMeshes();
  let vertices = 0;
  let triangles = 0;
  for (const mesh of meshes) {
    for (const primitive of mesh.listPrimitives()) {
      vertices += primitive.getAttribute("POSITION").getCount();
      triangles += (primitive.getIndices()?.getCount() ?? primitive.getAttribute("POSITION").getCount()) / 3;
    }
  }
  const r = document.getRoot();
  return {
    nodes: r.listNodes().length,
    meshes: meshes.length,
    materials: r.listMaterials().length,
    textures: r.listTextures().length,
    accessors: r.listAccessors().length,
    vertices,
    triangles,
  };
}

const sourceHash = sha256(SOURCE);
const document = await io.read(SOURCE);

// The structure this script was written for.
const roots = sceneRoots(document);
const rootNames = roots.map((n) => n.getName()).sort();
const expected = [KEEP_ROOT, ...REMOVE_ROOTS].sort();
if (JSON.stringify(rootNames) !== JSON.stringify(expected)) {
  fail(`Scene roots are ${JSON.stringify(rootNames)}, expected ${JSON.stringify(expected)}.`);
}
const keepRoot = roots.find((n) => n.getName() === KEEP_ROOT);
const removeRoots = roots.filter((n) => REMOVE_ROOTS.includes(n.getName()));
const keepNodes = subtree(keepRoot);
const removeNodes = new Set(removeRoots.flatMap((n) => [...subtree(n)]));
for (const node of removeNodes) {
  if (keepNodes.has(node)) fail(`Node "${node.getName()}" is in both copies.`);
}

// Copy B must share no mesh, vertex attribute or material with copy A. Shared index lists and
// images are expected (the exporter stored identical ones once); copy A still uses them, so they stay.
const keep = resources(keepNodes);
const remove = resources(removeNodes);
for (const kind of ["meshes", "attributes", "materials"]) {
  const shared = [...remove[kind]].filter((p) => keep[kind].has(p));
  if (shared.length > 0) fail(`Copy B shares ${shared.length} ${kind} with copy A.`);
}
const sharedIndices = [...remove.indices].filter((p) => keep.indices.has(p)).length;
const before = stats(document);

// Remove copy B, then what nothing else uses any more.
for (const node of removeNodes) node.dispose();
const orphan = (property) => property.listParents().every((parent) => parent instanceof Root);
const r = document.getRoot();
for (const mesh of r.listMeshes().filter(orphan)) {
  for (const primitive of mesh.listPrimitives()) primitive.dispose();
  mesh.dispose();
}
for (const accessor of r.listAccessors().filter(orphan)) accessor.dispose();
for (const material of r.listMaterials().filter(orphan)) material.dispose();
for (const texture of r.listTextures().filter(orphan)) texture.dispose();

await io.write(TARGET, document);

// Verify from the files on disk.
if (sha256(SOURCE) !== sourceHash) fail("The original model changed.");
const original = await io.read(SOURCE);
const written = await io.read(TARGET);
const writtenRoots = sceneRoots(written);
if (writtenRoots.length !== 1 || writtenRoots[0].getName() !== KEEP_ROOT) {
  fail(`Written scene roots are ${JSON.stringify(writtenRoots.map((n) => n.getName()))}.`);
}
const leftover = written.getRoot().listNodes().filter((n) => n.getName().endsWith(".002"));
if (leftover.length > 0) fail(`${leftover.length} ".002" nodes remain.`);
const originalKeep = sceneRoots(original).find((n) => n.getName() === KEEP_ROOT);
if (!writtenRoots[0].equals(originalKeep)) {
  // Name the first node that differs, for diagnosis.
  const byName = new Map([...subtree(originalKeep)].map((n) => [n.getName(), n]));
  const differing = [...subtree(writtenRoots[0])].find((n) => !byName.get(n.getName())?.equals(n));
  fail(`Copy A differs from the original (first difference at "${differing?.getName()}").`);
}
const after = stats(written);
const usedExtensions = written.getRoot().listExtensionsUsed().map((e) => e.extensionName).sort();

console.log(
  JSON.stringify(
    {
      source: { file: SOURCE, bytes: statSync(SOURCE).size, sha256: sourceHash, ...before },
      target: { file: TARGET, bytes: statSync(TARGET).size, sha256: sha256(TARGET), ...after },
      extensionsUsed: usedExtensions,
      indexListsSharedByBothCopies: sharedIndices,
      copyAIdentical: true,
    },
    null,
    2,
  ),
);
console.log("✓ Copy B removed; copy A is deeply identical to the original.");
