import { Color, Mesh, type Material, type Object3D } from "three";

/** The customiser's 3D shoe (Nike Air Force). */
export const SHOE_MODEL_URL = "/models/cshoe-airforce-v4.glb";

/**
 * The shoe's lights, as verified on /dev/3d-shoe: a key light from above-front,
 * a softer fill and a rim light. Shared by the 3D viewer and its thumbnails so
 * both show the same colours.
 */
export const SHOE_LIGHTS = {
  ambient: 0.35,
  hemisphere: { sky: "#ffffff", ground: "#c9c9c9", intensity: 0.55 },
  directional: [
    { position: [3, 5, 3], intensity: 1.7 },
    { position: [-3, 2, -1], intensity: 0.45 },
    { position: [-1, 3, -4], intensity: 0.6 },
  ],
} as const;

/**
 * The GLB objects that make up each customisable part, keyed by database part
 * id (customization_parts.id). Objects are matched by their original GLB name
 * (see applyPartColours). Most side panels exist once per side: the named
 * object is one side, an unnamed pattern its mirror image. (The original export
 * held a hidden duplicate of the shoe, its ".002" objects; the optimised model
 * has only the visible one — see scripts/optimize-shoe.mjs.)
 */
export const SHOE_PART_NODES: Readonly<Record<string, readonly string[]>> = {
  vamp: ["Vamp", "Pattern_85173_Node"],
  quarter: ["Quarter", "Pattern_678803_Node"],
  "toe-cap": ["Toe_Cap"],
  // Both lacing panels, plus the U-shaped band across the front of the lace
  // opening that carries the first pair of eyelets (one unnamed half per side).
  eyestay: ["Eyestay", "Pattern_947336_Node", "Pattern_5219998_Node", "Pattern_5220005_Node"],
  tongue: ["Tongue"],
  // Each lace crossing is its own object; "Laces" is only one of the 13.
  laces: [
    "Laces",
    "Pattern_363806_Node",
    "Pattern_363807_Node",
    "Pattern_363811_Node",
    "Pattern_363812_Node",
    "Pattern_363813_Node",
    "Pattern_363814_Node",
    "Pattern_363815_Node",
    "Pattern_363816_Node",
    "Pattern_363818_Node",
    "Pattern_363819_Node",
    "Pattern_363820_Node",
    "Pattern_363821_Node",
  ],
  // Not yet identified in the model (its former object is the far-side quarter).
  "heel-counter": [],
  swoosh: ["Swoosh", "Pattern_1435288_Node"],
  // The curved rear panel: "Collar" in the model is one half of it, the unnamed pattern the other.
  collar: ["Collar", "Pattern_1272464_Node"],
  // The sole sidewall. (The model's "Outsole" is only the stitch line around it.)
  midsole: ["Sole_Piece_3"],
  // The tread and the band around the bottom of the sole; the model's
  // "Midsole" is that band's toe and heel ends.
  outsole: ["Sole_Base", "Midsole"],
  // The narrow strip down the back centre, below the collar: two unnamed halves.
  "heel-tab": ["Pattern_1041490_Node", "Pattern_1080793_Node"],
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
