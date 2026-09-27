import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShoeViewerLoader } from "./ShoeViewerLoader";

export const metadata: Metadata = { title: "3D shoe test" };

// Development-only 3D viewer test (no customisation yet); 404 in production.
export default function Dev3dShoePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[960px] flex-col gap-4 bg-white px-4 py-6 sm:px-8">
      <div>
        <h1 className="text-heading font-semibold">3D shoe test</h1>
        <p className="mt-1 text-secondary text-ink/60">
          Nike Air Force from /models/cshoe-airforce-clean.glb. Drag to rotate, scroll or pinch to zoom.
        </p>
      </div>
      <ShoeViewerLoader />
    </main>
  );
}
