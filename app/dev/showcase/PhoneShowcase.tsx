"use client";

import { useSyncExternalStore, type SyntheticEvent } from "react";

// The app runs at its real phone size: a 430×932 screen (iPhone Pro Max
// points), of which the top 54px is the status bar.
const SCREEN_W = 430;
const SCREEN_H = 932;
const STATUS_BAR_H = 54;
const BEZEL = 14;
const PHONE_W = SCREEN_W + BEZEL * 2;
const PHONE_H = SCREEN_H + BEZEL * 2;
// Room for the side buttons plus breathing space around the phone.
const MARGIN = 48;

function subscribe(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

/** Largest scale (≤ 1) at which the whole phone fits the window. */
function getScale() {
  const margin = Math.min(MARGIN, window.innerWidth * 0.06);
  return Math.min(
    1,
    (window.innerWidth - margin * 2) / PHONE_W,
    (window.innerHeight - margin * 2) / PHONE_H,
  );
}

/**
 * Next's dev-tools badge would otherwise also render inside the phone, over
 * the bottom nav. It stays available on the showcase page itself.
 */
function hideDevIndicator(event: SyntheticEvent<HTMLIFrameElement>) {
  const doc = event.currentTarget.contentDocument;
  if (!doc) return;
  const style = doc.createElement("style");
  style.textContent = "nextjs-portal { display: none !important; }";
  doc.head.append(style);
}

function StatusBar() {
  return (
    <div
      aria-hidden
      className="flex items-center justify-between bg-page pr-[30px] pl-[52px] text-ink"
      style={{ height: STATUS_BAR_H }}
    >
      <span className="text-label font-semibold tracking-[-0.01em]">9:41</span>
      <span className="flex items-center gap-[7px]">
        {/* Signal */}
        <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        {/* Wi-Fi */}
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
          <path d="M8 2.4c2.2 0 4.2.8 5.7 2.2l1.2-1.2A9.9 9.9 0 0 0 8 .7 9.9 9.9 0 0 0 1.1 3.4l1.2 1.2A8.2 8.2 0 0 1 8 2.4Zm0 3.4c1.3 0 2.5.5 3.3 1.3l1.2-1.2A6.3 6.3 0 0 0 8 4.1c-1.8 0-3.4.7-4.5 1.8l1.2 1.2c.8-.8 2-1.3 3.3-1.3Zm0 3.4c-.5 0-.9.2-1.2.5L8 11l1.2-1.3c-.3-.3-.7-.5-1.2-.5Z" />
        </svg>
        {/* Battery */}
        <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="currentColor" opacity="0.35" />
          <rect x="2" y="2" width="20" height="9" rx="2" fill="currentColor" />
          <path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" fill="currentColor" opacity="0.4" />
        </svg>
      </span>
    </div>
  );
}

/** A side button on the phone's edge (drawn outside the body). */
function SideButton({ side, top, height }: { side: "left" | "right"; top: number; height: number }) {
  return (
    <span
      aria-hidden
      className="absolute w-[4px] bg-linear-to-b from-[#3a3a3c] via-[#1c1c1e] to-[#3a3a3c]"
      style={{
        top,
        height,
        [side]: -3,
        borderRadius: side === "left" ? "2px 0 0 2px" : "0 2px 2px 0",
      }}
    />
  );
}

/**
 * The existing app shown in a phone frame for presentations. The app is
 * loaded in an iframe with a real 430px viewport, so its layout, fixed bars
 * and navigation behave exactly as on a phone; the whole phone is scaled
 * down (never up) to fit smaller windows.
 */
export function PhoneShowcase() {
  const scale = useSyncExternalStore(subscribe, getScale, () => null);

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_50%_40%,#fbfbfa_0%,#ececea_55%,#dcdcd9_100%)]">
      <div
        style={{
          width: PHONE_W * (scale ?? 1),
          height: PHONE_H * (scale ?? 1),
          visibility: scale === null ? "hidden" : undefined,
        }}
      >
        <div
          className="relative origin-top-left"
          style={{ width: PHONE_W, height: PHONE_H, transform: `scale(${scale ?? 1})` }}
        >
          {/* Action button, volume up/down, side button */}
          <SideButton side="left" top={196} height={34} />
          <SideButton side="left" top={262} height={64} />
          <SideButton side="left" top={342} height={64} />
          <SideButton side="right" top={290} height={104} />

          {/* Body: thin dark bezel with a light metal edge */}
          <div
            className="absolute inset-0 rounded-[70px] bg-[#0b0b0c] shadow-[0_0_0_1px_#4a4a4d,0_0_0_3px_#c9c9cc,0_0_0_4px_#9d9da1,0_40px_80px_-30px_rgba(0,0,0,0.45),0_18px_36px_-18px_rgba(0,0,0,0.3)]"
            style={{ padding: BEZEL }}
          >
            <div
              className="relative overflow-hidden rounded-[56px] bg-page"
              style={{ width: SCREEN_W, height: SCREEN_H }}
            >
              <StatusBar />
              <iframe
                src="/"
                title="Custom Stride app"
                className="block border-0"
                style={{ width: SCREEN_W, height: SCREEN_H - STATUS_BAR_H }}
                onLoad={hideDevIndicator}
              />

              {/* Dynamic Island */}
              <span
                aria-hidden
                className="pointer-events-none absolute top-[11px] left-1/2 h-[37px] w-[126px] -translate-x-1/2 rounded-full bg-black"
              />
              {/* Home indicator */}
              <span
                aria-hidden
                className="pointer-events-none absolute bottom-[8px] left-1/2 h-[5px] w-[140px] -translate-x-1/2 rounded-full bg-ink/85"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
