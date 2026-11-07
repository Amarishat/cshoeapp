import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShoeCaptureLoader } from "./ShoeCaptureLoader";

export const metadata: Metadata = { title: "3D shoe capture" };

// Development-only render harness for scripts/shoe-baseline.mjs; 404 in production.
export default function Dev3dShoeCapturePage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="p-4">
      <ShoeCaptureLoader />
    </main>
  );
}
