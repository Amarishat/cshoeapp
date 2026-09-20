import type { Metadata, Viewport } from "next";
import { Inter, Jost, Sora } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

// Banner headlines only (stands in for Figma's Futura Md BT).
const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: "500",
});

export const metadata: Metadata = {
  title: {
    default: "Custom Stride",
    template: "%s · Custom Stride",
  },
  description: "Customise and shop sneakers from your favourite brands.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fefefe",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable} ${jost.variable} antialiased`}>
      <body className="font-sans">
        {/* The guest session, the customer stores and the 430px app column
            belong to the customer app, so the (tabs) and (stack) layouts
            provide them — not here, where /admin would inherit them. */}
        {children}
      </body>
    </html>
  );
}
