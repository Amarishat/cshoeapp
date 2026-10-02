"use client";

import { useGLTF } from "@react-three/drei";
import { Component, Suspense, useEffect, type ReactNode } from "react";
import { SHOE_MODEL_URL } from "./shoeModel";
import { shoeThumbnail } from "./shoeThumbnail";

type Props = {
  /** See thumbnailKey. */
  thumbnailKey: string;
  hexByPart: Readonly<Record<string, string>>;
  onReady: (url: string) => void;
  onError: () => void;
};

/**
 * Reports a model that can't be loaded instead of breaking the page around it.
 * The only thing below it that can throw is useGLTF, and it throws only once
 * the load has failed (a load in progress suspends instead).
 */
class LoadErrorBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    // The shared model cache keeps a failed load's error for good, which would
    // also stop the customiser loading the shoe until the page is reloaded.
    // Forget it, so the next use (the customiser, or this thumbnail on a later
    // visit) tries again. A loaded model is never cleared: it can't fail here.
    useGLTF.clear(SHOE_MODEL_URL);
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function Render({ thumbnailKey, hexByPart, onReady, onError }: Props) {
  // The same cached model as the customiser's viewer: loaded once per visit,
  // and not at all here if the customiser has already loaded it.
  const { scene } = useGLTF(SHOE_MODEL_URL);

  useEffect(() => {
    let cancelled = false;
    shoeThumbnail(thumbnailKey, scene, hexByPart).then(
      (url) => !cancelled && onReady(url),
      () => !cancelled && onError(),
    );
    return () => {
      cancelled = true;
    };
  }, [scene, thumbnailKey, hexByPart, onReady, onError]);

  return null;
}

/**
 * Makes one design's shoe thumbnail and reports it; draws nothing itself.
 * Browser-only (WebGL): load it through CustomisedShoeThumbnail's dynamic import.
 */
export function ShoeThumbnailRenderer(props: Props) {
  return (
    <LoadErrorBoundary onError={props.onError}>
      <Suspense fallback={null}>
        <Render {...props} />
      </Suspense>
    </LoadErrorBoundary>
  );
}
