"use client";

import dynamic from "next/dynamic";

/** Browser only: WebGL can't render on the server, and `ssr: false` is only allowed from a Client Component. */
export const ShoeCaptureLoader = dynamic(() => import("./ShoeCapture").then((m) => m.ShoeCapture), { ssr: false });
