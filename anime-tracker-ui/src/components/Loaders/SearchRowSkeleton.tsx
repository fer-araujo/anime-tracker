// Mirrors a SearchOverlay result row (gap, padding and the 56x84 thumbnail) so the list
// does not jump when results replace the placeholders.
export function SearchRowSkeleton({ showThumb = true }: { showThumb?: boolean }) {
  return (
    <div className="mb-1 flex items-center gap-4 px-3 py-2">
      {showThumb && (
        <div className="h-[84px] w-14 shrink-0 rounded-md border border-white/5 bg-white/5 animate-pulse" />
      )}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3 w-2/3 bg-white/5 rounded animate-pulse" />
        <div className="h-2 w-1/3 bg-white/5 rounded animate-pulse" />
      </div>
    </div>
  );
}
