import { Color, Mesh, type Material, type Object3D } from "three";

/** The customiser's 3D shoe (Nike Air Force). */
export const SHOE_MODEL_URL = "/models/cshoe-airforce-clean.glb";

/**
 * The GLB objects that make up each customisable part, keyed by database part
 * id (customization_parts.id). Objects are matched by their original GLB name
 * (see applyPartColours). The model holds overlapping copies of the shoe, each
 * with its own copy of every part — all must change or the old colour shows
 * through. Verified on /dev/3d-shoe.
 */
export const SHOE_PART_NODES: Readonly<Record<string, readonly string[]>> = {
  vamp: ["Vamp", "Vamp.001", "Vamp.002"],
  quarter: ["Quarter", "Quarter.001", "Quarter.002"],
  "toe-cap": ["Toe_Cap", "Toe_Cap.002"],
  eyestay: ["Eyestay", "Eyestay.001", "Eyestay.002"],
  tongue: ["Tongue", "Tongue.001", "Tongue.002"],
  laces: ["Laces", "Laces.001", "Laces.002"],
  // The model has no object named "Heel Counter"; it is this unnamed panel.
  "heel-counter": ["Pattern_678803_Node", "Pattern_678803_Node.002"],
  swoosh: ["Swoosh", "Swoosh.001", "Swoosh.002"],
  // The curved rear panel: "Collar" in the model is one half of it, the unnamed pattern the other.
  collar: ["Collar", "Collar.002", "Pattern_1272464_Node", "Pattern_1272464_Node.002"],
  midsole: ["Midsole", "Midsole.002"],
  outsole: ["Outsole", "Outsole.002"],
  // The narrow strip down the back centre, below the collar: two unnamed halves.
  "heel-tab": ["Pattern_1041490_Node", "Pattern_1041490_Node.002", "Pattern_1080793_Node", "Pattern_1080793_Node.002"],
};

/** GLB object name → part id. */
const PART_BY_NODE = new Map(
  Object.entries(SHOE_PART_NODES).flatMap(([partId, names]) => names.map((name) => [name, partId] as const)),
);

type MeshMaterial = Material | Material[];

/** Mesh userData kept by applyPartColours. */
interface RecolourData {
  /** The material(s) the model was loaded with; never changed. */
  originalMaterial?: MeshMaterial;
  /** This mesh's own copy of them, recoloured for its part. */
  partMaterial?: MeshMaterial;
}

function data(mesh: Mesh) {
  return mesh.userData as RecolourData;
}

function setColour(material: MeshMaterial, hex: string) {
  for (const m of Array.isArray(material) ? material : [material]) {
    if ("color" in m && m.color instanceof Color) m.color.set(hex);
  }
}

/**
 * Shows the shoe in exactly `hexByPart` (part id → hex): every mesh first goes
 * back to the material it was loaded with, then each listed part is recoloured.
 * A part with no colour stays as modelled, and nothing from an earlier call
 * carries over — the loaded scene is cached and shared between visits, so it
 * can't be trusted to start out plain.
 *
 * Objects are matched on the file's original name (kept by three's GLTFLoader
 * in `userData.name`), because the loader removes "." from `name` ("Swoosh.002"
 * is loaded as "Swoosh002"). The loaded materials are shared between parts and
 * with the rest of the shoe, so they are never changed: a recoloured mesh gets
 * its own copy (made once and reused). Only the loaded scene changes, not the file.
 */
export function applyPartColours(scene: Object3D, hexByPart: Readonly<Record<string, string>>) {
  scene.traverse((object) => {
    if (object instanceof Mesh && data(object).originalMaterial) object.material = data(object).originalMaterial;
  });

  scene.traverse((object) => {
    const partId = PART_BY_NODE.get(object.userData.name);
    const hex = partId && hexByPart[partId];
    if (!hex) return;
    object.traverse((mesh) => {
      if (!(mesh instanceof Mesh)) return;
      const own = data(mesh);
      own.originalMaterial ??= mesh.material as MeshMaterial;
      own.partMaterial ??= Array.isArray(own.originalMaterial)
        ? own.originalMaterial.map((m) => m.clone())
        : own.originalMaterial.clone();
      setColour(own.partMaterial, hex);
      mesh.material = own.partMaterial;
    });
  });
}
