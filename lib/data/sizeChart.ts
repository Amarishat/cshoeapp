import { ukToUs } from "@/lib/sizes";

export interface SizeChartColumn {
  uk: number;
  us: number;
  /** Foot length in cm from Figma; null where Figma has no value (UK 9–11). */
  footLengthCm: number | null;
}

/*
 * Figma Size Chart (1:2606) covers UK 3–8 with US = UK + 0.5. UK 9–11 are
 * added with the same rule so the chart covers every size on the Product
 * screen. Figma gives no foot lengths for UK 9–11 and no inch values at all;
 * those stay empty rather than being made up. Figma's Women's rows are
 * identical to the Men's rows, so both use the same sizes.
 */
const figmaFootLengthCm: Record<number, number> = {
  3: 22.7,
  3.5: 22.9,
  4: 25.7,
  4.5: 26.7,
  5: 27.7,
  5.5: 28.7,
  6: 29.7,
  6.5: 29.9,
  7: 30.7,
  7.5: 31.7,
  8: 37.9,
};

const ukSizes = [3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 9, 10, 11];

export async function getSizeChart(): Promise<SizeChartColumn[]> {
  return ukSizes.map((uk) => ({
    uk,
    us: ukToUs(uk),
    footLengthCm: figmaFootLengthCm[uk] ?? null,
  }));
}
