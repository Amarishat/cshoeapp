import type { ReactNode } from "react";

/**
 * The 430px app column. Full width on phones; centred on tablet/desktop (V1).
 *
 * Deliberately NOT a CSS container (`@container`): container-type can make this
 * element the containing block for position:fixed descendants in some browsers,
 * which would break the bottom nav and sticky bars. Components that need
 * container queries declare `@container` on themselves instead.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-app flex-col bg-page md:shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_8px_40px_rgba(0,0,0,0.08)]">
      {children}
    </div>
  );
}
