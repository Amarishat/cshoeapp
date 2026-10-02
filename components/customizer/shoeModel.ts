import { Color, Mesh, type Material, type Object3D } from "three";

/** The customiser's 3D shoe (Nike Air Force). */
export const SHOE_MODEL_URL = "/models/cshoe-airforce-clean.glb";

/**
 * The GLB objects that make up each customisable part, keyed by database part
 * id (customization_parts.id). Objects are matched by their original GLB name
 * (see applyPartColours). The model holds two overlapping copies of the shoe
 * (unsuffixed and ".002"), each with its own copy of every part — both must
 * change or the old colour shows through. Most side panels exist once per
 * side: the named object is one side, an unnamed pattern its mirror image.
 */
export const SHOE_PART_NODES: Readonly<Record<string, readonly string[]>> = {
  vamp: ["Vamp", "Vamp.002", "Pattern_85173_Node", "Pattern_85173_Node.002"],
  quarter: ["Quarter", "Quarter.002", "Pattern_678803_Node", "Pattern_678803_Node.002"],
  "toe-cap": ["Toe_Cap", "Toe_Cap.002"],
  // Both lacing panels, plus the U-shaped band across the front of the lace
  // opening that carries the first pair of eyelets (one unnamed half per side).
  eyestay: [
    "Eyestay", "Eyestay.002", "Pattern_947336_Node", "Pattern_947336_Node.002",
    "Pattern_5219998_Node", "Pattern_5219998_Node.002", "Pattern_5220005_Node", "Pattern_5220005_Node.002",
  ],
  tongue: ["Tongue", "Tongue.002"],
  // Each lace crossing is its own object; "Laces" is only one of the 13.
  laces: [
    "Laces", "Laces.002",
    "Pattern_363806_Node", "Pattern_363806_Node.002",
    "Pattern_363807_Node", "Pattern_363807_Node.002",
    "Pattern_363811_Node", "Pattern_363811_Node.002",
    "Pattern_363812_Node", "Pattern_363812_Node.002",
    "Pattern_363813_Node", "Pattern_363813_Node.002",
    "Pattern_363814_Node", "Pattern_363814_Node.002",
    "Pattern_363815_Node", "Pattern_363815_Node.002",
    "Pattern_363816_Node", "Pattern_363816_Node.002",
    "Pattern_363818_Node", "Pattern_363818_Node.002",
    "Pattern_363819_Node", "Pattern_363819_Node.002",
    "Pattern_363820_Node", "Pattern_363820_Node.002",
    "Pattern_363821_Node", "Pattern_363821_Node.002",
  ],
  // Not yet identified in the model (its former object is the far-side quarter).
  "heel-counter": [],
  swoosh: ["Swoosh", "Swoosh.002", "Pattern_1435288_Node", "Pattern_1435288_Node.002"],
  // The curved rear panel: "Collar" in the model is one half of it, the unnamed pattern the other.
  collar: ["Collar", "Collar.002", "Pattern_1272464_Node", "Pattern_1272464_Node.002"],
  // The sole sidewall. (The model's "Outsole" is only the stitch line around it.)
  midsole: ["Sole_Piece_3", "Sole_Piece_3.002"],
  // The tread and the band around the bottom of the sole; the model's
  // "Midsole" is that band's toe and heel ends.
  outsole: ["Sole_Base", "Sole_Base.002", "Midsole", "Midsole.002"],
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
