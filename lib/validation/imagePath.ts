/*
 * Image paths an admin can save for the storefront (brand logos, customiser
 * images). Only local files under /public are allowed: they're shown with
 * next/image, which throws on any other address (a web URL, a relative path,
 * even "h" half-way through typing "https://…"), and next.config.ts
 * deliberately allows no remote image hosts. So a saved path must look like
 * "/images/brands/nike.svg": one leading slash, plain file-name characters,
 * no "..", and an image extension.
 */

const LOCAL_IMAGE_PATH = /^\/(?!\/)[A-Za-z0-9._\-/]+\.(png|jpe?g|webp|avif|gif|svg)$/i;

/** Why `path` (already trimmed, not empty) can't be used as a local image; undefined when it can. */
export function imagePathError(path: string): string | undefined {
  if (!LOCAL_IMAGE_PATH.test(path) || path.split("/").includes("..")) {
    return "Use a local image path starting with “/”, e.g. /images/brands/nike.svg (png, jpg, webp, avif, gif or svg).";
  }
  return undefined;
}
