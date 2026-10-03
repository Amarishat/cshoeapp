import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Normally ".next". The Playwright E2E server sets E2E_NEXT_DIST_DIR=.next-e2e so its build and
  // dev cache never mix with the regular dev server's.
  distDir: process.env.E2E_NEXT_DIST_DIR || ".next",
};

export default nextConfig;
