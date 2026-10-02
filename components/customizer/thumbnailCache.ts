/**
 * Finished customised-shoe thumbnails, kept in memory for the visit (see
 * shoeThumbnail). Kept apart from it so pages can read them without loading three.
 */

/** Most thumbnails kept (each is a PNG data URL of roughly 50–100 KB). */
const MAX_CACHED = 40;

/** key → PNG data URL, oldest first. */
const done = new Map<string, string>();

/** A stable key for one product in one design: the same colours give the same key. */
export function thumbnailKey(productId: string, hexByPart: Readonly<Record<string, string>>) {
  const parts = Object.keys(hexByPart)
    .sort()
    .map((part) => `${part}=${hexByPart[part]}`);
  return `${productId}|${parts.join(",")}`;
}

/** The finished thumbnail for `key`, if it has already been made. Safe to call while rendering. */
export function cachedShoeThumbnail(key: string): string | undefined {
  return done.get(key);
}

export function rememberShoeThumbnail(key: string, url: string) {
  done.delete(key);
  done.set(key, url);
  // Forget the oldest beyond the limit.
  for (const oldest of done.keys()) {
    if (done.size <= MAX_CACHED) break;
    done.delete(oldest);
  }
}
