import { getSizeChart, type SizeChartColumn } from "@/lib/data/sizeChart";
import { getProductBySlug } from "@/lib/data/supabaseCatalog";

export interface SizeChartPageData {
  productName: string;
  /** The reference size chart (all columns, UK 3–11). */
  columns: SizeChartColumn[];
}

/**
 * A product's size chart page. The product itself comes from Supabase; the
 * chart is the static reference chart from lib/data/sizeChart.ts (the
 * database has no measurements). The product's purchasable sizes
 * (product_sizes) don't limit the chart — it is a reference for all sizes.
 */
export async function loadSizeChartPage(slug: string): Promise<SizeChartPageData> {
  const [product, columns] = await Promise.all([getProductBySlug(slug), getSizeChart()]);
  if (!product) throw new Error(`Product "${slug}" is not in the catalogue.`);
  return { productName: product.name, columns };
}
