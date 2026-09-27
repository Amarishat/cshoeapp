"use client";

import dynamic from "next/dynamic";

/**
 * Loads the 3D viewer in the browser only: WebGL can't render on the server,
 * and `ssr: false` is only allowed from a Client Component.
 */
export const ShoeViewerLoader = dynamic(() => import("./ShoeViewer3D").then((m) => m.ShoeViewer3D), {
  ssr: false,
  loading: () => (
    <div className="flex h-[min(70dvh,640px)] min-h-[320px] w-full items-center justify-center rounded-card border border-border bg-surface">
      <p className="text-secondary text-ink/60">Loading 3D viewer…</p>
    </div>
  ),
});
