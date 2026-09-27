"use client";

import { Bounds, Center, ContactShadows, Html, OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Component, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Box3, Color, Mesh, type Material, type Object3D, Vector3 } from "three";

const MODEL_URL = "/models/cshoe-airforce-clean.glb";

// ---- Temporary test: recolour one part ---------------------------------------
type RecolourResult = { objects: number; meshes: number };

type PartColourTest = {
  /** The part's first GLB name ("Swoosh"); also its key in state and in the list. */
  label: string;
  button: string;
  /** Recolours the part in the loaded scene. */
  apply: (scene: Object3D) => RecolourResult;
  /** The status line after `apply`. */
  status: (result: RecolourResult) => string;
};

/**
 * One test button that recolours one shoe part: every object whose original
 * GLB name is one of `names` (the model can hold overlapping copies of the
 * shoe, each with its own copy of the part — all must change or the old
 * colour shows through) is set to `colour`.
 *
 * Matched on the file's original name (kept by three's GLTFLoader in
 * `userData.name`), because the loader removes "." from `name` ("Swoosh.001"
 * is loaded as "Swoosh001"). Every mesh in the part gets its own copy of its
 * material(s) before the base colour changes: parts share materials with each
 * other and with the rest of the shoe (Collar, Eyestay, …), which must keep
 * their colour. Idempotent: an already-copied material is reused. Nothing in
 * the file changes — only the loaded scene in this page.
 */
function partColourTest(names: string | readonly string[], colour: string, button: string): PartColourTest {
  const partNames: readonly string[] = typeof names === "string" ? [names] : names;
  const label = partNames[0];

  function apply(scene: Object3D): RecolourResult {
    const parts: Object3D[] = [];
    scene.traverse((object) => {
      if (partNames.includes(object.userData.name)) parts.push(object);
    });

    let meshes = 0;
    for (const part of parts) {
      part.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        const own = (material: Material) => {
          const copy = object.userData.ownTestMaterial ? material : material.clone();
          if ("color" in copy && copy.color instanceof Color) copy.color.set(colour);
          return copy;
        };
        object.material = Array.isArray(object.material) ? object.material.map(own) : own(object.material);
        object.userData.ownTestMaterial = true;
        meshes += 1;
      });
    }
    return { objects: parts.length, meshes };
  }

  function status({ objects }: RecolourResult) {
    return objects === 0
      ? `No ${label} objects (${partNames.join(", ")}) found in the model.`
      : `Recoloured ${objects} ${label} object${objects === 1 ? "" : "s"} to ${colour}.`;
  }

  return { label, button, apply, status };
}

const PART_COLOUR_TESTS = [
  partColourTest(["Swoosh", "Swoosh.001", "Swoosh.002"], "#E24C4D", "Make Swoosh Red"),
  partColourTest(["Vamp", "Vamp.001", "Vamp.002"], "#4CAF50", "Make Vamp Green"),
  partColourTest(["Quarter", "Quarter.001", "Quarter.002"], "#FC8B4C", "Make Quarter Orange"),
  partColourTest(["Eyestay", "Eyestay.001", "Eyestay.002"], "#8E44AD", "Make Eyestay Purple"),
  partColourTest(["Tongue", "Tongue.001", "Tongue.002"], "#3498DB", "Make Tongue Blue"),
  partColourTest(["Laces", "Laces.001", "Laces.002"], "#F1C40F", "Make Laces Yellow"),
  partColourTest(["Heel Counter", "Heel Counter.001", "Heel Counter.002"], "#9B59B6", "Make Heel Counter Purple"),
  partColourTest(["Collar", "Collar.002", "Pattern_1272464_Node", "Pattern_1272464_Node.002"], "#E67E22", "Make Collar Orange"),
  partColourTest(["Toe_Cap", "Toe_Cap.001", "Toe_Cap.002"], "#2ECC71", "Make Toe Cap Green"),
  partColourTest(["Midsole", "Midsole.001", "Midsole.002"], "#7F8C8D", "Make Midsole Gray"),
  partColourTest(["Outsole", "Outsole.001", "Outsole.002"], "#34495E", "Make Outsole Dark Gray"),
  partColourTest(["Sole_Base", "Sole_Base.001", "Sole_Base.002"], "#2C3E50", "Make Tread Dark Blue"),
];

type ShoeProps = {
  /** Labels of the tests whose buttons were pressed. */
  requested: readonly string[];
  onRecolour: (label: string, result: RecolourResult) => void;
};

function Shoe({ requested, onRecolour }: ShoeProps) {
  const { scene } = useGLTF(MODEL_URL);
  useEffect(() => {
    for (const test of PART_COLOUR_TESTS) {
      if (requested.includes(test.label)) onRecolour(test.label, test.apply(scene));
    }
  }, [scene, requested, onRecolour]);
  return <primitive object={scene} />;
}

/** Shown in the scene while the model downloads. */
function Loading() {
  const { progress } = useProgress();
  return (
    <Html center>
      <p className="whitespace-nowrap text-secondary text-ink/60">Loading model… {Math.round(progress)}%</p>
    </Html>
  );
}

/** A missing or broken model file shows a message instead of breaking the page. */
class ModelErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="flex h-full items-center justify-center p-6 text-center">
          <p className="text-secondary text-danger [overflow-wrap:anywhere]">
            Couldn’t load {MODEL_URL}: {this.state.error}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Fits the camera to the shoe. Bounds sizes the view so the shoe's longest
 * side fits whichever of the view's width or height is tighter; the margin
 * scales that. On a wide viewer there's room to spare, so a smaller margin
 * makes the shoe larger; on a narrow (portrait) one the length is what limits
 * it, so the margin stays just over 1 and the shoe is never clipped side-on.
 */
function FittedShoe({ requested, onRecolour }: ShoeProps) {
  const aspect = useThree((state) => state.size.width / state.size.height);
  const { scene } = useGLTF(MODEL_URL);
  // The shoe's measured size, so the shadow fits whatever model is loaded.
  const size = useMemo(() => new Box3().setFromObject(scene).getSize(new Vector3()), [scene]);
  const footprint = Math.max(size.x, size.z);
  return (
    <>
      <Bounds fit clip observe margin={aspect >= 1 ? 0.8 : 1.02}>
        {/* `top` stands the shoe on the ground plane (y = 0), where its shadow is. */}
        <Center top>
          <Shoe requested={requested} onRecolour={onRecolour} />
        </Center>
      </Bounds>
      {/* Soft shadow on the ground under the shoe, sized from it; outside Bounds so it
          doesn't change the framing. */}
      <ContactShadows
        position={[0, -footprint * 0.002, 0]}
        scale={footprint * 1.8}
        far={size.y * 0.7}
        blur={2.4}
        opacity={0.45}
        resolution={512}
      />
    </>
  );
}

/**
 * The shoe, centred and fitted to the view on a neutral light-grey background. Drag to
 * rotate, scroll or pinch to zoom (OrbitControls; panning is off so the shoe
 * stays centred). A key light from above-front, a softer fill from the other
 * side and a rim light from behind give it depth, with a soft contact shadow
 * under it; no environment map, so nothing is fetched besides the model.
 */
export function ShoeViewer3D() {
  // Temporary test controls (see partColourTest): the parts asked for, and what each did.
  const [requested, setRequested] = useState<string[]>([]);
  const [recolours, setRecolours] = useState<Record<string, RecolourResult>>({});
  const onRecolour = useCallback(
    (label: string, result: RecolourResult) => setRecolours((current) => ({ ...current, [label]: result })),
    [],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="h-[min(70dvh,640px)] min-h-[320px] w-full overflow-hidden rounded-card border border-border bg-surface touch-none">
        <ModelErrorBoundary>
          {/* A three-quarter side view: the shoe runs along its z-axis, so looking
              down that axis (as before) showed it toe-on, at its narrowest. */}
          <Canvas camera={{ position: [2.4, 0.9, 1.4], fov: 40 }} dpr={[1, 2]}>
            {/* Neutral light grey (the app's surface colour), so white parts of the shoe still read. */}
            <color attach="background" args={["#f5f5f5"]} />
            {/* Less flat light than before, more directional light, for clearer depth. */}
            <ambientLight intensity={0.35} />
            <hemisphereLight args={["#ffffff", "#c9c9c9", 0.55]} />
            {/* Key: above and in front of the starting view. */}
            <directionalLight position={[3, 5, 3]} intensity={1.7} />
            {/* Fill: the other side, softer, so shadows on the shoe stay open. */}
            <directionalLight position={[-3, 2, -1]} intensity={0.45} />
            {/* Rim: from behind, to outline the shoe against the background. */}
            <directionalLight position={[-1, 3, -4]} intensity={0.6} />
            <Suspense fallback={<Loading />}>
              <FittedShoe requested={requested} onRecolour={onRecolour} />
            </Suspense>
            <OrbitControls makeDefault enablePan={false} enableDamping />
          </Canvas>
        </ModelErrorBoundary>
      </div>

      {/* Temporary test controls: each recolours only its own part (PART_COLOUR_TESTS). */}
      <div className="flex flex-col gap-2">
        {PART_COLOUR_TESTS.map(({ label, button, status }) => {
          const result = recolours[label];
          return (
            <div key={label} className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setRequested((current) => (current.includes(label) ? current : [...current, label]))}
                disabled={requested.includes(label)}
                className="h-10 rounded-full bg-primary px-5 text-secondary font-medium text-white disabled:opacity-50"
              >
                {button}
              </button>
              <p role="status" className="text-secondary text-ink/60">
                {result ? status(result) : ""}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
