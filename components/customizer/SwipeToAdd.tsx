"use client";

import Image from "next/image";
import { useRef, useState, type PointerEvent } from "react";

const MAX_DRAG = 44; // how far the bag icon can travel inside the pill
const THRESHOLD = 36; // drag distance that counts as "swiped down"

/**
 * "Swipe down to add" control (Figma 1:6646): 55×115 pill, 32px radius,
 * #0A0A0A outline, bag icon over two down-arrows. Dragging the bag down past
 * the threshold adds to the bag; a tap or Enter/Space does the same.
 * `disabled` blocks the swipe (e.g. until a size is chosen).
 */
export function SwipeToAdd({
  onAdd,
  label,
  disabled = false,
}: {
  onAdd: () => void;
  label: string;
  disabled?: boolean;
}) {
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<number | null>(null);
  const suppressClick = useRef(false);

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (disabled) return;
    start.current = event.clientY;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (start.current === null) return;
    setDrag(Math.min(MAX_DRAG, Math.max(0, event.clientY - start.current)));
  }

  function onPointerUp() {
    if (start.current === null) return;
    start.current = null;
    setDragging(false);
    if (drag >= THRESHOLD) {
      suppressClick.current = true;
      onAdd();
    } else if (drag > 4) {
      // A short drag that didn't reach the threshold shouldn't count as a tap.
      suppressClick.current = true;
    }
    setDrag(0);
  }

  function onClick() {
    if (disabled) return;
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onAdd();
  }

  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={disabled || undefined}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        start.current = null;
        setDragging(false);
        setDrag(0);
      }}
      className="relative h-[115px] w-[55px] shrink-0 touch-none rounded-[32px] border border-[#0a0a0a] select-none aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
    >
      <Image
        src="/images/customizer/bag.svg"
        alt=""
        width={24}
        height={24}
        unoptimized
        draggable={false}
        className="absolute top-[18px] left-[15px] size-6"
        style={{
          transform: `translateY(${drag}px)`,
          transition: dragging ? "none" : "transform 200ms ease-out",
        }}
      />
      <Image
        src="/images/customizer/arrow-down.svg"
        alt=""
        width={24}
        height={24}
        unoptimized
        draggable={false}
        className="absolute top-[57px] left-[15px] size-6"
      />
      <Image
        src="/images/customizer/arrow-down-muted.svg"
        alt=""
        width={24}
        height={24}
        unoptimized
        draggable={false}
        className="absolute top-[74px] left-[15px] size-6"
      />
    </button>
  );
}
