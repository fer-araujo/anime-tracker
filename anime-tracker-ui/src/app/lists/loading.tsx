export default function ListsLoading() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 py-8 space-y-8">
        {/* Header skeleton */}
        <div className="h-8 w-48 bg-white/10 rounded-lg" />

        {/* Create list button skeleton */}
        <div className="h-11 w-36 bg-white/10 rounded-xl" />

        {/* List cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
