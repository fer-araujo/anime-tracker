export default function SeasonLoading() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 py-8 space-y-8">
        {/* Filters skeleton */}
        <div className="flex gap-4 flex-wrap">
          <div className="h-10 w-40 bg-white/10 rounded-lg" />
          <div className="h-10 w-32 bg-white/10 rounded-lg" />
          <div className="h-10 w-36 bg-white/10 rounded-lg" />
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-[3/4] bg-white/10 rounded-xl" />
              <div className="h-4 bg-white/10 rounded w-3/4" />
              <div className="h-3 bg-white/10 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
