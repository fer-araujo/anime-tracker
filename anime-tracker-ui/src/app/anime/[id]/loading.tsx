export default function AnimeDetailLoading() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      <div className="h-[40vh] bg-white/5" />
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 py-8 space-y-6">
        <div className="h-8 w-64 bg-white/10 rounded-lg" />
        <div className="flex gap-4">
          <div className="w-48 h-72 bg-white/10 rounded-xl shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-5 bg-white/10 rounded w-3/4" />
            <div className="h-5 bg-white/10 rounded w-1/2" />
            <div className="h-5 bg-white/10 rounded w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}
