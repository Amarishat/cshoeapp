"use client";

import { useEffect, useRef } from "react";

/**
 * Small modal confirmation built on <dialog> (focus trap and Esc for free).
 * Not in Figma; styled with the app's tokens: white card, black pill primary,
 * outlined pill secondary.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        // Click on the backdrop (outside the card) cancels.
        if (event.target === ref.current) onCancel();
      }}
      className="m-auto w-[calc(100%-40px)] max-w-[350px] rounded-card bg-white p-6 text-ink backdrop:bg-black/40"
    >
      <h2 id="confirm-title" className="text-body font-medium">
        {title}
      </h2>
      {message && <p className="mt-2 text-secondary text-ink/70">{message}</p>}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="h-12 flex-1 rounded-full border border-border bg-white text-label font-semibold"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="h-12 flex-1 rounded-full bg-primary text-label font-semibold text-white"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
