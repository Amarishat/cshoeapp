"use client";

import { Bounds, Center, ContactShadows, OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Component, Suspense, useLayoutEffect, useMemo, type ReactNode } from "react";
import { Box3, Vector3 } from "three";
import { applyPartColours, SHOE_MODEL_URL } from "./shoeModel";

type ShoeProps = {
  /** Part id → hex; a part with none stays as modelled. */
  hexByPart: Readonly<Record<string, string>>;
};

function Shoe({ hexByPart }: ShoeProps) {
  const { scene } = useGLTF(SHOE_MODEL_URL);
  // Before the frame is drawn, so a cached scene never shows a previous design.
  useLayoutEffect(() => applyPartColours(scene, hexByPart), [scene, hexByPart]);
  return <primitive object={scene} />;
}

/**
 * Shown over the canvas while the model downloads. Plain DOM outside the
 * Canvas: drei's <Html> as a Suspense fallback unmounts its own React root
 * mid-render when the model arrives, which React rejects (removeChild error).
 */
function Loading() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <p className="whitespace-nowrap text-secondary text-ink/60">Loading shoe… {Math.round(progress)}%</p>
    </div>
  );
}

/** A missing or broken model file shows a message instead of breaking the page. */
class ModelErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div role="alert" className="flex h-full items-center justify-center p-6 text-center">
          <p className="text-secondary text-danger">Couldn’t load the 3D shoe.</p>
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
  const { scene } = useGLTF(SHOE_MODEL_URL);
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

/**
 * The 3D shoe in `hexByPart`'s colours, filling its parent, on a transparent
 * background. Drag to rotate, scroll or pinch to zoom (OrbitControls; panning
 * is off so the shoe stays centred). Lighting as verified on /dev/3d-shoe: a
 * key light from above-front, a softer fill and a rim light, with a soft
 * contact shadow; no environment map, so nothing is fetched besides the model.
 * Browser-only (WebGL): load it through ShoeViewer3D's dynamic import.
 */
export function ShoeCanvas3D({ hexByPart }: ShoeProps) {
  return (
    <ModelErrorBoundary>
      {/* A three-quarter side view: the shoe runs along its z-axis. */}
      <Canvas camera={{ position: [2.4, 0.9, 1.4], fov: 40 }} dpr={[1, 2]}>
        <ambientLight intensity={0.35} />
        <hemisphereLight args={["#ffffff", "#c9c9c9", 0.55]} />
        <directionalLight position={[3, 5, 3]} intensity={1.7} />
        <directionalLight position={[-3, 2, -1]} intensity={0.45} />
        <directionalLight position={[-1, 3, -4]} intensity={0.6} />
        <Suspense fallback={null}>
          <FittedShoe hexByPart={hexByPart} />
        </Suspense>
        <OrbitControls makeDefault enablePan={false} enableDamping />
      </Canvas>
      <Loading />
    </ModelErrorBoundary>
  );
}

useGLTF.preload(SHOE_MODEL_URL);
