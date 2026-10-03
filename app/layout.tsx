import type { Metadata, Viewport } from "next";
import { preload } from "react-dom";
import "./fonts.css";
import "./globals.css";

// Self-hosted fonts (app/fonts.css). Preload only the Latin subsets, as
// next/font/google did with subsets: ["latin"].
const PRELOADED_FONTS = [
  "/fonts/inter-latin.woff2",
  "/fonts/sora-latin.woff2",
  "/fonts/jost-500-latin.woff2",
];

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
  for (const href of PRELOADED_FONTS) {
    preload(href, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  }

  return (
    <html lang="en" className="antialiased">
      <body className="font-sans">
        {/* The guest session, the customer stores and the 430px app column
            belong to the customer app, so the (tabs) and (stack) layouts
            provide them — not here, where /admin would inherit them. */}
        {children}
      </body>
    </html>
  );
}
