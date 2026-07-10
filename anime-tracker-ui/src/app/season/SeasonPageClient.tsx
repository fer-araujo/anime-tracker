"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { fetchSeason } from "@/lib/api";
import { Anime } from "@/types/anime";
import { AnimeCard } from "@/components/AnimeCard";
import GridSkeleton from "@/components/Loaders/GridSkeleton";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Pure filter/sort helpers (extracted for testing)                          */
/* -------------------------------------------------------------------------- */

export function filterBySearch(anime: Anime[], query: string): Anime[] {
  if (!query.trim()) return anime;
  const q = query.toLowerCase();
  return anime.filter((a) => a.title.toLowerCase().includes(q));
}

export function filterByGenre(anime: Anime[], genres: Set<string>): Anime[] {
  if (genres.size === 0) return anime;
  return anime.filter((a) => a.meta?.genres?.some((g) => genres.has(g)));
}

export type SortKey = "rating" | "popularity" | "title";

export function sortAnime(anime: Anime[], sortBy: SortKey): Anime[] {
  return [...anime].sort((a, b) => {
    if (sortBy === "title") {
      return a.title.localeCompare(b.title);
    }
    const aVal = sortBy === "rating" ? a.meta?.rating : a.meta?.popularity;
    const bVal = sortBy === "rating" ? b.meta?.rating : b.meta?.popularity;
    return (bVal ?? -Infinity) - (aVal ?? -Infinity);
  });
}

/* -------------------------------------------------------------------------- */
/*  Season name helper                                                        */
/* -------------------------------------------------------------------------- */

const SEASON_NAMES: Record<string, string> = {
  WINTER: "Invierno",
  SPRING: "Primavera",
  SUMMER: "Verano",
  FALL: "Otoño",
};

function seasonLabel(season: string): string {
  return SEASON_NAMES[season] ?? season;
}

/* -------------------------------------------------------------------------- */
/*  SeasonPageClient                                                          */
/* -------------------------------------------------------------------------- */

type Props = {
  year?: string;
  season?: string;
};

export default function SeasonPageClient({ year: yearProp, season: seasonProp }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlYear = searchParams.get("year") ?? yearProp;
  const urlSeason = searchParams.get("season") ?? seasonProp;

  /* ---- State ---- */
  const [animeList, setAnimeList] = useState<Anime[]>([]);
  const [seasonMeta, setSeasonMeta] = useState<{
    season: string;
    year: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortKey>("rating");
  const [filterOpen, setFilterOpen] = useState(false);

  /* ---- Fetch data ---- */
  const fetchData = useCallback(
    async (y?: string, s?: string) => {
      setLoading(true);
      setError(null);
      try {
        const opts: { year?: number; season?: string } = {};
        if (y) opts.year = Number(y);
        if (s) opts.season = s;
        const resp = await fetchSeason(opts);
        setAnimeList(resp.data as Anime[]);
        setSeasonMeta({ season: resp.meta.season, year: resp.meta.year });
        setSelectedGenres(new Set());
        setSearchQuery("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load season data");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /* ---- Fetch on mount and URL change ---- */
  useEffect(() => {
    fetchData(urlYear, urlSeason);
  }, [urlYear, urlSeason, fetchData]);

  /* ---- Computed values ---- */
  const allGenres = useMemo(
    () =>
      [...new Set(animeList.flatMap((a) => a.meta?.genres ?? []))].sort(),
    [animeList],
  );

  const filtered = useMemo(() => {
    let result = animeList;
    result = filterBySearch(result, searchQuery);
    result = filterByGenre(result, selectedGenres);
    result = sortAnime(result, sortBy);
    return result;
  }, [animeList, searchQuery, selectedGenres, sortBy]);

  /* ---- URL sync ---- */
  function updateSeasonParams(y: string, s: string) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("year", y);
    p.set("season", s);
    router.replace(`/season?${p.toString()}`, { scroll: false });
  }

  /* ---- Handlers ---- */
  const handleCardOpen = useCallback(
    (anime: Anime) => {
      router.push(`/anime/${anime.id.anilist}`);
    },
    [router],
  );

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) => {
      const next = new Set(prev);
      if (next.has(genre)) next.delete(genre);
      else next.add(genre);
      return next;
    });
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedGenres(new Set());
    setSortBy("rating");
  };

  const retry = () => {
    fetchData(urlYear, urlSeason);
  };

  /* ---- States ---- */
  if (loading) {
    return (
      <main className="min-h-screen bg-[#1a1720] pt-24 px-6 md:px-10 lg:px-16">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 w-48 bg-white/5 rounded-lg animate-shimmer mb-8" />
          <GridSkeleton variant="grid" count={20} />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#1a1720] pt-24 px-6 md:px-10 lg:px-16">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[50vh] text-center">
          <p className="text-white/70 text-lg mb-4">Could not load season data</p>
          <button
            onClick={retry}
            className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  /* ---- Empty API state (backend returned data: []) ---- */
  if (!loading && !error && animeList.length === 0) {
    return (
      <main className="min-h-screen bg-[#1a1720] pt-24 px-6 md:px-10 lg:px-16">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[50vh] text-center">
          <p className="text-white/70 text-lg">No anime available for this season</p>
        </div>
      </main>
    );
  }

  /* ---- Data loaded ---- */
  const seasonHeading = seasonMeta
    ? `${seasonLabel(seasonMeta.season)} ${seasonMeta.year}`
    : "Season";

  return (
    <main className="min-h-screen bg-[#1a1720] pt-24 px-6 md:px-10 lg:px-16">
      <div className="max-w-7xl mx-auto">
        {/* Heading */}
        <h1 className="text-2xl md:text-3xl font-semibold text-white/90 mb-6">
          {seasonHeading}
        </h1>

        {/* Search + Filters row */}
        <div className="flex flex-col gap-4 mb-8">
          {/* Search bar */}
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 max-w-sm px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white/90 placeholder-white/40 text-sm focus:outline-none focus:border-white/30 transition-colors"
            />
            <button
              onClick={() => setFilterOpen((prev) => !prev)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                filterOpen
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10",
              )}
            >
              Filters
            </button>
          </div>

          {/* Filter panel — AnimatePresence */}
          <AnimatePresence initial={false}>
            {filterOpen && (
              <motion.div
                key="filter-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="bg-[#1a1720]/95 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Year select */}
                    <div>
                      <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
                        Year
                      </label>
                      <select
                        value={urlYear ?? ""}
                        onChange={(e) => {
                          const y = e.target.value;
                          const s = urlSeason || seasonMeta?.season || "SUMMER";
                          updateSeasonParams(y, s);
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/90 text-sm focus:outline-none focus:border-white/30"
                      >
                        {Array.from({ length: 11 }, (_, i) => {
                          const y = new Date().getFullYear() - 5 + i;
                          return (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Season select */}
                    <div>
                      <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
                        Season
                      </label>
                      <select
                        value={urlSeason ?? seasonMeta?.season ?? ""}
                        onChange={(e) => {
                          const s = e.target.value;
                          const y = urlYear || String(seasonMeta?.year ?? new Date().getFullYear());
                          updateSeasonParams(y, s);
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/90 text-sm focus:outline-none focus:border-white/30"
                      >
                        {["WINTER", "SPRING", "SUMMER", "FALL"].map((s) => (
                          <option key={s} value={s}>
                            {seasonLabel(s)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Genre checkboxes */}
                    <div>
                      <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
                        Genre
                      </label>
                      {allGenres.length === 0 ? (
                        <p className="text-white/40 text-sm">No genres available</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                          {allGenres.map((genre) => (
                            <button
                              key={genre}
                              onClick={() => toggleGenre(genre)}
                              className={cn(
                                "text-left text-sm px-2 py-1 rounded transition-colors",
                                selectedGenres.has(genre)
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : "text-white/60 hover:text-white/90 hover:bg-white/5",
                              )}
                            >
                              {genre}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Sort radio group */}
                    <div>
                      <label className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
                        Sort by
                      </label>
                      <div className="flex flex-col gap-2">
                        {[
                          { value: "rating" as const, label: "Rating" },
                          { value: "popularity" as const, label: "Popularity" },
                          { value: "title" as const, label: "Title (A-Z)" },
                        ].map((opt) => (
                          <label
                            key={opt.value}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors",
                              sortBy === opt.value
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "text-white/60 hover:text-white/90 hover:bg-white/5",
                            )}
                          >
                            <input
                              type="radio"
                              name="sort"
                              value={opt.value}
                              checked={sortBy === opt.value}
                              onChange={() => setSortBy(opt.value)}
                              className="sr-only"
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5 lg:gap-6">
            {filtered.map((anime) => (
              <AnimeCard
                key={anime.id.anilist}
                anime={anime}
                variant="compact"
                showTitleBelow
                onOpen={handleCardOpen}
              />
            ))}
          </div>
        ) : (
          /* ---- Empty filter state ---- */
          <div className="flex flex-col items-center justify-center min-h-[30vh] text-center">
            <p className="text-white/70 text-lg mb-4">No anime match your filters</p>
            <button
              onClick={resetFilters}
              className="px-6 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 transition-colors cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
