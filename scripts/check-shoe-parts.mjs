#!/usr/bin/env node
/**
 * Guard: the 3D customiser's part mapping still matches the model and the catalogue.
 *
 *   npm run check:shoe-parts [-- path/to/model.glb]
 *
 * Checks, for SHOE_PART_NODES (components/customizer/shoeModel.ts):
 *  - every seeded customisation part (supabase/migrations/003_seed_catalog.sql) has an entry;
 *  - every GLB object it names exists in the model (by original name, as applyPartColours matches);
 *  - no object is claimed by two parts;
 *  - every part shown to customers reaches at least one mesh, in every copy of the shoe the model
 *    holds (a part missing from a copy would show that copy's original colour).
 * Only the GLB's JSON chunk is read, so this also works on meshopt/Draco-compressed files.
 * Exits 1 on any failure.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { SHOE_MODEL_URL, SHOE_PART_NODES } from "../components/customizer/shoeModel.ts";

const root = fileURLToPath(new URL("..", import.meta.url));

/**
 * Parts the customiser hides because the model has no mesh for them
 * (HIDDEN_PART_IDS in components/customizer/CustomizerView.tsx).
 */
const HIDDEN_PART_IDS = new Set(["heel-counter"]);

/** The objects that hold each copy of the shoe (see shoeModel.ts): unsuffixed, and ".002". */
const COPIES = { A: ["shoe_Scene_Node"], B: ["Avatar.002", "Cloth.002"] };

function readGlbJson(path) {
  const glb = readFileSync(path);
  if (glb.toString("utf8", 0, 4) !== "glTF") throw new Error(`${path} is not a GLB file`);
  const jsonLength = glb.readUInt32LE(12);
  return JSON.parse(glb.toString("utf8", 20, 20 + jsonLength));
}

function seededPartIds() {
  const sql = readFileSync(`${root}supabase/migrations/003_seed_catalog.sql`, "utf8");
  const block = sql.slice(sql.indexOf("insert into public.customization_parts"));
  return [...block.slice(0, block.indexOf(";")).matchAll(/\('nike-air-force', '([^']+)'/g)].map((m) => m[1]);
}

const modelPath = process.argv[2] ?? `${root}public${SHOE_MODEL_URL}`;
const gltf = readGlbJson(modelPath);
const nodes = gltf.nodes ?? [];
const errors = [];

const indexByName = new Map();
nodes.forEach((node, i) => {
  if (node.name !== undefined) indexByName.set(node.name, i);
});

/** Mesh-bearing node indices at or under `index`. */
function meshNodesUnder(index, out = []) {
  if (nodes[index].mesh !== undefined) out.push(index);
  for (const child of nodes[index].children ?? []) meshNodesUnder(child, out);
  return out;
}

/** Copy name ("A" / "B") per node index, from each copy's root objects. */
const copyOf = new Map();
for (const [copy, roots] of Object.entries(COPIES)) {
  for (const rootName of roots) {
    const index = indexByName.get(rootName);
    if (index === undefined) continue;
    const mark = (i) => {
      copyOf.set(i, copy);
      for (const child of nodes[i].children ?? []) mark(child);
    };
    mark(index);
  }
}
const copiesInModel = [...new Set(copyOf.values())].sort();

// Every seeded part has an entry.
const seeded = seededPartIds();
for (const id of seeded) {
  if (!(id in SHOE_PART_NODES)) errors.push(`Seeded part "${id}" has no SHOE_PART_NODES entry.`);
}
for (const id of Object.keys(SHOE_PART_NODES)) {
  if (!seeded.includes(id)) errors.push(`SHOE_PART_NODES has "${id}", which is not a seeded part.`);
}

// Every named object exists, belongs to one part, and the visible parts reach meshes in every copy.
const owner = new Map();
const report = [];
for (const [partId, names] of Object.entries(SHOE_PART_NODES)) {
  const meshesByCopy = Object.fromEntries(copiesInModel.map((c) => [c, 0]));
  for (const name of names) {
    if (owner.has(name)) errors.push(`"${name}" is mapped to both "${owner.get(name)}" and "${partId}".`);
    owner.set(name, partId);
    const index = indexByName.get(name);
    if (index === undefined) {
      errors.push(`Part "${partId}": object "${name}" is not in the model.`);
      continue;
    }
    const meshes = meshNodesUnder(index);
    if (meshes.length === 0) errors.push(`Part "${partId}": object "${name}" has no mesh.`);
    for (const m of meshes) {
      const copy = copyOf.get(m);
      if (copy) meshesByCopy[copy] += 1;
    }
  }
  const hidden = HIDDEN_PART_IDS.has(partId);
  if (!hidden) {
    for (const copy of copiesInModel) {
      if (meshesByCopy[copy] === 0) errors.push(`Part "${partId}" has no mesh in copy ${copy}.`);
    }
  }
  report.push({ partId, hidden, objects: names.length, ...meshesByCopy });
}

const visible = report.filter((r) => !r.hidden).length;
console.log(`Model: ${modelPath}`);
console.log(`Copies of the shoe in the model: ${copiesInModel.join(", ") || "none detected"}`);
console.table(report);
if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s):\n- ${errors.join("\n- ")}`);
  process.exit(1);
}
console.log(`OK: ${visible} customer-visible parts all map to meshes in the model.`);
