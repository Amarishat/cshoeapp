/** Loading / error UI shared by screens that read the catalogue from Supabase. */

/** Pulsing stand-in with the product card's footprint (tile + text lines). */
export function CardPlaceholder() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="aspect-[187/198] rounded-[20px] bg-surface" />
      <div className="mt-[11px] flex flex-col gap-2 px-[15px]">
        <div className="h-4 w-3/4 rounded bg-surface" />
        <div className="h-3.5 w-1/2 rounded bg-surface" />
        <div className="h-4 w-2/3 rounded bg-surface" />
      </div>
    </div>
  );
}

/** "Couldn't load the catalogue" (or `title`) with the Supabase error and a retry. */
export function CatalogueError({
  message,
  onRetry,
  title = "Couldn’t load the catalogue.",
}: {
  message: string;
  onRetry: () => void;
  title?: string;
}) {
  return (
    <div role="alert" className="mx-gutter rounded-[15px] bg-surface px-4 py-4">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-[15px] text-ink/60 [overflow-wrap:anywhere]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 h-10 rounded-full border border-border bg-white px-5 text-[15px] font-medium"
      >
        Try again
      </button>
    </div>
  );
}
