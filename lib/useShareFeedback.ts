"use client";

import { useEffect, useRef, useState } from "react";

const FEEDBACK_MS = 2000;

/**
 * Share via the native share sheet when available; otherwise copy `copyText`
 * to the clipboard and expose a short-lived confirmation/error message to
 * show next to the control (and announce with role="status"). A dismissed
 * share sheet is not an error.
 */
export function useShareFeedback() {
  const [feedback, setFeedback] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function show(message: string) {
    setFeedback(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFeedback(""), FEEDBACK_MS);
  }

  async function share({
    data,
    copyText,
    copied,
    failed,
  }: {
    data: ShareData;
    copyText: string;
    copied: string;
    failed: string;
  }) {
    if (navigator.share) {
      try {
        await navigator.share(data);
      } catch {
        // Share sheet dismissed — nothing to do.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(copyText);
      show(copied);
    } catch {
      show(failed);
    }
  }

  return { feedback, share };
}
