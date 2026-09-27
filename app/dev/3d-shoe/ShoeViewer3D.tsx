"use client";

import { Bounds, Center, Html, OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Component, Suspense, type ReactNode } from "react";

const MODEL_URL = "/models/cshoe-airforce.glb";

function Shoe() {
  const { scene } = useGLTF(MODEL_URL);
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
 * The shoe, centred and fitted to the view on a neutral light-grey background. Drag to
 * rotate, scroll or pinch to zoom (OrbitControls; panning is off so the shoe
 * stays centred). Simple ambient + key/fill lights, no environment map, so
 * nothing is fetched besides the model.
 */
export function ShoeViewer3D() {
  return (
    <div className="h-[min(70dvh,640px)] min-h-[320px] w-full overflow-hidden rounded-card border border-border bg-surface touch-none">
      <ModelErrorBoundary>
        {/* A three-quarter side view: the shoe runs along its z-axis, so looking
            down that axis (as before) showed it toe-on, at its narrowest. */}
        <Canvas camera={{ position: [2.4, 0.9, 1.4], fov: 40 }} dpr={[1, 2]}>
          {/* Neutral light grey (the app's surface colour), so white parts of the shoe still read. */}
          <color attach="background" args={["#f5f5f5"]} />
          <ambientLight intensity={0.6} />
          <hemisphereLight args={["#ffffff", "#bdbdbd", 0.6]} />
          <directionalLight position={[3, 5, 4]} intensity={1.4} />
          <directionalLight position={[-4, 2, -3]} intensity={0.5} />
          <Suspense fallback={<Loading />}>
            {/* Fits the camera to the model whatever its size or origin, with little
                space around it so the shoe fills most of the view. */}
            <Bounds fit clip observe margin={0.9}>
              <Center>
                <Shoe />
              </Center>
            </Bounds>
          </Suspense>
          <OrbitControls makeDefault enablePan={false} enableDamping />
        </Canvas>
      </ModelErrorBoundary>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
