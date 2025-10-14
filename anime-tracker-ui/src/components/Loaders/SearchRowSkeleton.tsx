// SearchRowSkeleton.tsx
export function SearchRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <div className="h-12 w-8 rounded-md bg-muted animate-pulse" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
        <div className="h-2 w-1/3 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}
