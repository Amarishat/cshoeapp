"use client";

import { Bounds, Center, ContactShadows, Html, OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Component, Suspense, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { Box3, Vector3 } from "three";
import { applyPartColours, SHOE_MODEL_URL as MODEL_URL } from "@/components/customizer/shoeModel";
import { cn } from "@/lib/cn";

// ---- Temporary test: part colour selectors -----------------------------------
/** The parts with a colour selector, by database part id (GLB objects: SHOE_PART_NODES). */
const COLOUR_SELECTORS = [
  { label: "Swoosh", partId: "swoosh" },
  { label: "Vamp", partId: "vamp" },
  { label: "Quarter", partId: "quarter" },
  { label: "Eyestay", partId: "eyestay" },
  { label: "Tongue", partId: "tongue" },
  { label: "Laces", partId: "laces" },
  { label: "Heel Counter", partId: "heel-counter" },
  { label: "Collar", partId: "collar" },
  { label: "Heel Tab", partId: "heel-tab" },
  { label: "Toe Cap", partId: "toe-cap" },
  { label: "Midsole", partId: "midsole" },
  { label: "Outsole", partId: "outsole" },
];

const SWATCHES = [
  { name: "Black", hex: "#1A1A1A" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Red", hex: "#E24C4D" },
  { name: "Blue", hex: "#3498DB" },
  { name: "Green", hex: "#4CAF50" },
];

type ShoeProps = {
  /** The chosen swatch's hex per part id; a part with none stays as modelled. */
  selected: Readonly<Record<string, string>>;
};

function Shoe({ selected }: ShoeProps) {
  const { scene } = useGLTF(MODEL_URL);
  useLayoutEffect(() => applyPartColours(scene, selected), [scene, selected]);
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
function FittedShoe(props: ShoeProps) {
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
          <Shoe {...props} />
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

/** One part's row of swatches: the chosen one gets a dark ring. */
function PartColourSelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (hex: string) => void;
}) {
  const labelId = `${label.toLowerCase().replace(/\s+/g, "-")}-colour-label`;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p id={labelId} className="w-16 text-secondary font-medium">
        {label}
      </p>
      <div role="radiogroup" aria-labelledby={labelId} className="flex items-center gap-2.5">
        {SWATCHES.map(({ name, hex }) => {
          const selected = hex === value;
          return (
            <button
              key={hex}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={name}
              title={name}
              onClick={() => onChange(hex)}
              className={cn(
                "h-7 w-7 rounded-full border border-ink/20 outline-offset-2",
                selected && "outline-2 outline-ink",
              )}
              style={{ backgroundColor: hex }}
            />
          );
        })}
      </div>
    </div>
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
  // Part colour selectors: the chosen swatch per part (none until one is picked).
  const [selected, setSelected] = useState<Record<string, string>>({});

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
              <FittedShoe selected={selected} />
            </Suspense>
            <OrbitControls makeDefault enablePan={false} enableDamping />
          </Canvas>
        </ModelErrorBoundary>
      </div>

      {/* Part colour selectors: each swatch recolours only its own part (SHOE_PART_NODES). */}
      {COLOUR_SELECTORS.map(({ label, partId }) => (
        <PartColourSelector
          key={partId}
          label={label}
          value={selected[partId] ?? null}
          onChange={(hex) => setSelected((current) => ({ ...current, [partId]: hex }))}
        />
      ))}
    </div>
  );
}

useGLTF.preload(MODEL_URL);
