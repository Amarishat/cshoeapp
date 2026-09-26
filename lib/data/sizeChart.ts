import { ukToUs } from "@/lib/sizes";

export interface SizeChartColumn {
  uk: number;
  us: number;
  /** Foot length in cm; null (shown as "—") while no verified measurements exist. */
  footLengthCm: number | null;
}

/*
 * Figma Size Chart (1:2606) covers UK 3–8 with US = UK + 0.5. UK 9–11 are
 * added with the same rule so the chart covers every size on the Product
 * screen. Figma's Women's rows are identical to the Men's rows, so both use
 * the same sizes.
 *
 * No foot lengths are shown: Figma's values (UK 3 = 22.7 cm … UK 8 =
 * 37.9 cm) are design placeholders, not real measurements — uneven steps and
 * implausible sizes — and customers would take them as sizing advice. Every
 * size shows "—" until verified measurements are added here.
 */

const ukSizes = [3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 9, 10, 11];

export async function getSizeChart(): Promise<SizeChartColumn[]> {
  return ukSizes.map((uk) => ({
    uk,
    us: ukToUs(uk),
    footLengthCm: null,
  }));
}
