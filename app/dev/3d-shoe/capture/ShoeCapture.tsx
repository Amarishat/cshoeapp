"use client";

import { useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useState } from "react";
import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Vector3,
  WebGLRenderer,
  type Object3D,
} from "three";
import { applyPartColours, SHOE_LIGHTS, SHOE_MODEL_URL, SHOE_PART_NODES } from "@/components/customizer/shoeModel";
import { shoeThumbnail } from "@/components/customizer/shoeThumbnail";

/** Render size in px. */
const WIDTH = 640;
const HEIGHT = 480;

/**
 * The objects holding each copy of the shoe (see shoeModel.ts): copy A is the
 * unsuffixed one, copy B the ".002" one. Matched on the GLB's original names.
 */
const COPY_ROOTS = { A: ["shoe_Scene_Node"], B: ["Avatar.002", "Cloth.002"] } as const;

/** Which copies to draw: both (as the app does), or only one. */
type Copy = "both" | "A" | "B";

/**
 * Fixed views, as directions from the shoe's centre (it runs along z, toe at
 * +z, outer side at +x): the customiser's starting three-quarter view, the
 * Bag thumbnail's outer side view, and a high rear view of the inner side.
 */
const ANGLES: readonly Angle[] = [
  { name: "three-quarter", direction: [2.4, 0.9, 1.4] },
  { name: "outer-side", direction: [1, 0.18, 0] },
  { name: "rear-inner", direction: [-1, 0.9, -1.6] },
];

/**
 * Close-ups (`?closeups=1`), where full-resolution textures and fine geometry
 * show: the toe box's leather, the laces on the eyestay, the sole's tread from
 * below, and the stitching around the heel.
 * `target` is relative to the shoe's centre, as fractions of its size;
 * `distance` is a fraction of its bounding radius.
 */
const CLOSE_UPS: readonly Angle[] = [
  { name: "close-toe-leather", direction: [1, 0.6, 0.5], target: [0.25, -0.05, 0.3], distance: 0.4 },
  { name: "close-laces", direction: [0.6, 1, 0.5], target: [0.1, 0.2, 0.1], distance: 0.45 },
  { name: "close-sole-tread", direction: [0.5, -1, 0.3], target: [0, -0.5, 0.15], distance: 0.5 },
  { name: "close-heel-stitching", direction: [0.9, 0.25, -1], target: [0.3, 0, -0.35], distance: 0.4 },
];

type Angle = {
  name: string;
  direction: readonly [number, number, number];
  target?: readonly [number, number, number];
  distance?: number;
};

type Hexes = Readonly<Record<string, string>>;

export interface ShoeCaptureApi {
  /** The model file loaded. */
  model: string;
  /** The copies of the shoe the model holds. */
  copies: ("A" | "B")[];
  /** Customer-visible part ids with GLB objects. */
  parts: string[];
  angles: string[];
  /** The shoe drawn with only `copy` visible, in `hexByPart`, from `angle`: a PNG data URL. */
  render(options: { copy: Copy; angle: number; hexByPart: Hexes }): string;
  /** The Bag's thumbnail (shoeThumbnail, as BagItemRow shows it) with only `copy` visible. */
  thumbnail(options: { copy: Copy; hexByPart: Hexes }): Promise<string>;
  /** Pixel comparison of two PNG data URLs, with an image marking the differing pixels. */
  diff(a: string, b: string): Promise<DiffResult>;
}

interface DiffResult {
  total: number;
  /** Pixels with any channel different at all, by more than 8, and by more than 16 levels (of 255). */
  changed: number;
  changedOver8: number;
  changedOver16: number;
  maxDelta: number;
  /** Mean of the largest channel difference, over the differing pixels only. */
  meanDeltaOfChanged: number;
  image: string;
}

declare global {
  interface Window {
    __shoeCapture?: ShoeCaptureApi;
  }
}

/** Each copy's root objects; empty for a copy the model doesn't have (an optimised model has only A). */
function copyRoots(scene: Object3D) {
  const find = (names: readonly string[]) => {
    const found: Object3D[] = [];
    // The original GLB name, as applyPartColours matches (the loader changes `name`).
    scene.traverse((object) => {
      if (names.includes(object.userData.name)) found.push(object);
    });
    return found;
  };
  return { A: find(COPY_ROOTS.A), B: find(COPY_ROOTS.B) };
}

function showOnly(roots: ReturnType<typeof copyRoots>, copy: Copy) {
  if (copy !== "both" && roots[copy].length === 0) throw new Error(`This model has no copy ${copy}.`);
  for (const root of roots.A) root.visible = copy !== "B";
  for (const root of roots.B) root.visible = copy !== "A";
}

async function pixels(url: string) {
  const image = new Image();
  image.src = url;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("No 2D canvas.");
  context.drawImage(image, 0, 0);
  return { canvas, context, data: context.getImageData(0, 0, image.width, image.height) };
}

async function diff(a: string, b: string): Promise<DiffResult> {
  const [first, second] = await Promise.all([pixels(a), pixels(b)]);
  if (first.data.width !== second.data.width || first.data.height !== second.data.height) {
    throw new Error("Images differ in size.");
  }
  const out = first.context.createImageData(first.data.width, first.data.height);
  let changed = 0;
  let changedOver8 = 0;
  let changedOver16 = 0;
  let maxDelta = 0;
  let deltaSum = 0;
  for (let i = 0; i < first.data.data.length; i += 4) {
    let delta = 0;
    for (let c = 0; c < 4; c++) delta = Math.max(delta, Math.abs(first.data.data[i + c] - second.data.data[i + c]));
    maxDelta = Math.max(maxDelta, delta);
    deltaSum += delta;
    if (delta > 0) changed++;
    if (delta > 8) changedOver8++;
    if (delta > 16) changedOver16++;
    // Faded first image, with differing pixels in solid red.
    const grey = (first.data.data[i] + first.data.data[i + 1] + first.data.data[i + 2]) / 3;
    out.data[i] = delta > 0 ? 255 : 200 + grey / 5;
    out.data[i + 1] = delta > 0 ? 0 : 200 + grey / 5;
    out.data[i + 2] = delta > 0 ? 0 : 200 + grey / 5;
    out.data[i + 3] = 255;
  }
  first.context.putImageData(out, 0, 0);
  return {
    total: first.data.width * first.data.height,
    changed,
    changedOver8,
    changedOver16,
    maxDelta,
    meanDeltaOfChanged: changed ? Number((deltaSum / changed).toFixed(2)) : 0,
    image: first.canvas.toDataURL("image/png"),
  };
}

function Capture({
  model,
  closeUps,
  onReady,
}: {
  model: string;
  closeUps: boolean;
  onReady: (ready: boolean) => void;
}) {
  const { scene } = useGLTF(model);

  useEffect(() => {
    const roots = copyRoots(scene);
    const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(WIDTH, HEIGHT, false);
    // As the customiser's canvas (react-three-fiber's default) and the Bag thumbnails.
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.setClearColor(0xffffff, 1);

    const { ambient, hemisphere, directional } = SHOE_LIGHTS;
    const lights: Object3D[] = [
      new AmbientLight(0xffffff, ambient),
      new HemisphereLight(hemisphere.sky, hemisphere.ground, hemisphere.intensity),
      ...directional.map(({ position, intensity }) => {
        const light = new DirectionalLight(0xffffff, intensity);
        light.position.fromArray(position);
        return light;
      }),
    ];

    scene.updateMatrixWorld(true);
    const box = new Box3().setFromObject(scene);
    const centre = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    const radius = size.length() / 2;
    const angles = closeUps ? [...ANGLES, ...CLOSE_UPS] : ANGLES;
    const cameras = angles.map(({ direction, target, distance }) => {
      const camera = new PerspectiveCamera(35, WIDTH / HEIGHT, radius / 100, radius * 20);
      // Whole-shoe views look at its centre from far enough to fit it; close-ups at a point on it.
      const look = target ? centre.clone().add(new Vector3(...target).multiply(size)) : centre;
      const away = distance !== undefined ? radius * distance : (radius / Math.sin((camera.fov * Math.PI) / 360)) * 1.02;
      camera.position.copy(look).addScaledVector(new Vector3(...direction).normalize(), away);
      camera.lookAt(look);
      camera.updateMatrixWorld(true);
      return camera;
    });

    window.__shoeCapture = {
      model,
      copies: (["A", "B"] as const).filter((copy) => roots[copy].length > 0),
      parts: Object.entries(SHOE_PART_NODES)
        .filter(([, names]) => names.length > 0)
        .map(([id]) => id),
      angles: angles.map((a) => a.name),
      render({ copy, angle, hexByPart }) {
        const camera = cameras[angle];
        if (!camera) throw new Error(`No angle ${angle}.`);
        showOnly(roots, copy);
        scene.add(...lights);
        try {
          applyPartColours(scene, hexByPart);
          renderer.render(scene, camera);
          return renderer.domElement.toDataURL("image/png");
        } finally {
          scene.remove(...lights);
          applyPartColours(scene, {});
          showOnly(roots, "both");
        }
      },
      async thumbnail({ copy, hexByPart }) {
        showOnly(roots, copy);
        try {
          // A key of its own per copy, so the thumbnail cache can't hand back another copy's image.
          return await shoeThumbnail(`capture:${copy}:${JSON.stringify(hexByPart)}`, scene, hexByPart);
        } finally {
          showOnly(roots, "both");
        }
      },
      diff,
    };
    onReady(true);

    return () => {
      onReady(false);
      delete window.__shoeCapture;
      renderer.dispose();
    };
  }, [model, closeUps, scene, onReady]);

  return null;
}

/** `?model=/models/<file>.glb` loads another model file (e.g. an optimised one); otherwise the customiser's. */
function modelFromUrl() {
  const model = new URLSearchParams(window.location.search).get("model");
  return model && /^\/models\/[\w.-]+\.glb$/.test(model) ? model : SHOE_MODEL_URL;
}

/**
 * Development-only capture harness for the 3D shoe (driven by scripts/shoe-baseline.mjs):
 * loads the model exactly as the customiser and Bag do (useGLTF, applyPartColours,
 * SHOE_LIGHTS, shoeThumbnail) and exposes window.__shoeCapture to render it with
 * either copy of the shoe hidden. Changes nothing in the model file.
 */
export function ShoeCapture() {
  const [ready, setReady] = useState(false);
  const [model] = useState(modelFromUrl);
  const [closeUps] = useState(() => new URLSearchParams(window.location.search).get("closeups") === "1");
  return (
    <div data-capture-ready={ready ? "true" : "false"}>
      <p className="text-secondary text-ink/60">{ready ? `Capture ready: ${model}` : `Loading ${model}…`}</p>
      <Suspense fallback={null}>
        <Capture model={model} closeUps={closeUps} onReady={setReady} />
      </Suspense>
    </div>
  );
}
