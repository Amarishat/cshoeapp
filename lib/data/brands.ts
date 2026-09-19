import type { Brand } from "@/lib/types";

// Home "Brands" row (Figma 1:1785), in Figma order.
const brands: Brand[] = [
  { id: "nike", name: "Nike", logo: "/images/brands/nike.svg", logoWidth: 24, logoHeight: 28 },
  { id: "adidas", name: "Adidas", logo: "/images/brands/adidas.svg", logoWidth: 30, logoHeight: 30 },
  { id: "puma", name: "Puma", logo: "/images/brands/puma.svg", logoWidth: 30, logoHeight: 30 },
  { id: "reebok", name: "Reebok", logo: "/images/brands/reebok.svg", logoWidth: 36, logoHeight: 45 },
  {
    id: "new-balance",
    name: "New Balance",
    logo: "/images/brands/new-balance.svg",
    logoWidth: 30,
    logoHeight: 14.43,
  },
  { id: "fila", name: "Fila", logo: "/images/brands/fila.svg", logoWidth: 30, logoHeight: 9.93 },
  { id: "asics", name: "Asics", logo: "/images/brands/asics.png", logoWidth: 38, logoHeight: 30 },
];

export async function getBrands(): Promise<Brand[]> {
  return brands;
}
