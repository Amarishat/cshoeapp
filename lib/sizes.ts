export type SizeSystem = "uk" | "us";

/**
 * UK/India → US size. Figma Size Chart (1:2606) uses a constant offset of
 * +0.5 (UK 3–8 → US 3.5–8.5); the same rule covers UK 9–11 on the Product screen.
 */
export function ukToUs(uk: number): number {
  return uk + 0.5;
}

export function sizeLabel(uk: number, system: SizeSystem): string {
  return String(system === "uk" ? uk : ukToUs(uk));
}
