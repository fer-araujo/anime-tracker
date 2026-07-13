"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { fetchSeason } from "@/lib/api";
import type { Anime } from "@/types/anime";
import { AnimeCard } from "@/components/AnimeCard";
import GridSkeleton from "@/components/Loaders/GridSkeleton";
import Select, { type SelectOption } from "@/components/custom/Select";
import { Pagination } from "@/components/custom/Pagination";
import { cn } from "@/lib/utils";
import "./season-ambience.css";

/* -------------------------------------------------------------------------- */
/*  Filter/sort helpers (extracted for testing)                                */
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

const SORT_OPTIONS: SelectOption[] = [
  { value: "rating", label: "Rating" },
  { value: "popularity", label: "Popularidad" },
  { value: "title", label: "Título (A-Z)" },
];

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

export function pickBackdrop(animeList: Anime[]): string | null {
  const sorted = [...animeList].sort(
    (a, b) => (b.meta?.rating ?? -Infinity) - (a.meta?.rating ?? -Infinity),
  );
  return sorted.find((a) => a.images?.backdrop)?.images?.backdrop ?? null;
}

/* -------------------------------------------------------------------------- */
/*  Season helpers                                                             */
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

function buildSeasonOptions(): SelectOption[] {
  return [
    { value: "", label: "Todo el año" },
    ...["WINTER", "SPRING", "SUMMER", "FALL"].map((s) => ({
      value: s,
      label: seasonLabel(s),
    })),
  ];
}

function buildYearOptions(): SelectOption[] {
  const current = new Date().getFullYear();
  // Past 5 years + current + 1 future year (for upcoming seasons with data)
  return Array.from({ length: 7 }, (_, i) => {
    const y = current - 5 + i;
    return { value: String(y), label: String(y) };
  });
}

function getDefaultYear(): string {
  return String(new Date().getFullYear());
}

function getDefaultSeason(): string {
  const m = new Date().getMonth(); // 0-11
  if (m >= 0 && m <= 2) return "WINTER";
  if (m >= 3 && m <= 5) return "SPRING";
  if (m >= 6 && m <= 8) return "SUMMER";
  return "FALL";
}

/* -------------------------------------------------------------------------- */
/*  SeasonPage                                                                */
/* -------------------------------------------------------------------------- */

type Props = {
  year?: string;
  season?: string;
};

export default function SeasonPage({ year: yearProp, season: seasonProp }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlYear = searchParams.get("year") ?? yearProp ?? getDefaultYear();
  const urlSeason = searchParams.get("season") ?? seasonProp ?? getDefaultSeason();

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
  const [genrePanelOpen, setGenrePanelOpen] = useState(false);

  /* ---- Pagination ---- */
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

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
        const data = resp.data as Anime[];
        setAnimeList(data);
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

  /* ---- Computed values (ALL hooks BEFORE early returns) ---- */
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

  // Reset to page 1 when data or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [animeList, searchQuery, selectedGenres, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  );

  const seasonOptions = useMemo(() => buildSeasonOptions(), []);
  const yearOptions = useMemo(() => buildYearOptions(), []);

  /* ---- URL sync ---- */
  function updateSeasonParams(y: string, s: string) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("year", y);
    if (s) {
      p.set("season", s);
    } else {
      p.delete("season");
    }
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

  const hasActiveFilters =
    searchQuery.trim() || selectedGenres.size > 0 || sortBy !== "rating";

  /* ========================================================================= */
  /*  RENDER                                                                    */
  /* ========================================================================= */

  const containerClasses =
    "min-h-screen pt-24 px-6 md:px-10 lg:px-16 pb-16";

  /* ---- Ambience backdrop layer ---- */
  /* Pure dark top for header compatibility, subtle gradient depth at bottom,
     plus a cinematic ambient glow that visibly pulses from below.          */
  const backdropLayer = (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Depth gradient — pure dark top, whisper of lighter gray at bottom */}
      <div className="absolute inset-0 ambience-base" />

      {/* Cinematic ambient glow from bottom — pulsing, visible, warm light */}
      <div className="absolute inset-0 ambience-glow" />
    </div>
  );

  /* ---- Loading ---- */
  if (loading) {
    return (
      <>
        {backdropLayer}
        <main className={containerClasses}>
        <div className="max-w-7xl mx-auto">
          <div className="h-8 w-48 bg-white/5 rounded-lg animate-shimmer mb-8" />
          <GridSkeleton variant="grid" count={20} />
        </div>
      </main>
    </>
    );
  }

  /* ---- Error ---- */
  if (error) {
    return (
      <>
        {backdropLayer}
        <main className={containerClasses}>
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[50vh] text-center">
          <p className="text-muted-foreground text-lg mb-4">
            Could not load season data
          </p>
          <button
            onClick={retry}
            className="h-10 px-6 bg-white/10 hover:bg-white/20 text-foreground rounded-xl transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      </main>
    </>
    );
  }

  /* ---- Empty API ---- */
  if (!loading && !error && animeList.length === 0) {
    return (
      <>
        {backdropLayer}
        <main className={containerClasses}>
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[50vh] text-center">
          <p className="text-muted-foreground text-lg">
            No anime available for this season
          </p>
        </div>
      </main>
    </>
    );
  }

  /* ---- Data loaded ---- */
  const seasonHeading = seasonMeta
    ? `${seasonLabel(seasonMeta.season)} ${seasonMeta.year}`
    : "Season";

  return (
    <>
      {backdropLayer}
      <main className={containerClasses}>
      <div className="max-w-7xl mx-auto">
        {/* ===== Heading ===== */}
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-8">
          {seasonHeading}
        </h1>

        {/* ===== Toolbar: Year, Season, Sort, Search, Genres ===== */}
        <div className="flex flex-wrap items-end gap-3 mb-6">
          {/* Year */}
          <div className="w-[120px]">
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              Año
            </label>
            <Select
              options={yearOptions}
              value={urlYear ?? ""}
              onChange={(y) => {
                const s = urlSeason ?? seasonMeta?.season ?? getDefaultSeason();
                updateSeasonParams(y, s);
              }}
              placeholder="Año"
            />
          </div>

          {/* Season */}
          <div className="w-[150px]">
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              Temporada
            </label>
            <Select
              options={seasonOptions}
              value={urlSeason ?? seasonMeta?.season ?? ""}
              onChange={(s) => {
                const y =
                  urlYear ||
                  String(seasonMeta?.year ?? new Date().getFullYear());
                updateSeasonParams(y, s);
              }}
              placeholder="Temporada"
            />
          </div>

          {/* Sort */}
          <div className="w-[170px]">
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              Ordenar por
            </label>
            <Select
              options={SORT_OPTIONS}
              value={sortBy}
              onChange={(v) => setSortBy(v as SortKey)}
              placeholder="Ordenar"
            />
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[220px] max-w-sm">
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              &nbsp;
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Filtrar por título…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                spellCheck={false}
                className="h-10 w-full pl-4 pr-4 bg-white/10 border border-white/10 text-foreground placeholder:text-white/50 backdrop-blur-xs rounded-xl transition-all duration-300 focus:bg-black/40 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
              />
            </div>
          </div>

          {/* Genres toggle */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              &nbsp;
            </label>
            <button
              onClick={() => setGenrePanelOpen((prev) => !prev)}
              className={cn(
                "h-10 px-4 rounded-xl text-sm font-medium transition-colors cursor-pointer border",
                genrePanelOpen || selectedGenres.size > 0
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "bg-white/10 text-muted-foreground hover:bg-white/20 border-white/10",
              )}
            >
              Géneros
              {selectedGenres.size > 0 && (
                <span className="ml-2 text-xs bg-primary/30 px-1.5 py-0.5 rounded-full">
                  {selectedGenres.size}
                </span>
              )}
            </button>
          </div>

          {/* Reset */}
          {hasActiveFilters && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                &nbsp;
              </label>
              <button
                onClick={resetFilters}
                className="h-10 px-3 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Limpiar
              </button>
            </div>
          )}
        </div>

        {/* ===== Genre panel (collapsible) ===== */}
        <AnimatePresence initial={false}>
          {genrePanelOpen && (
            <motion.div
              key="genre-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden mb-6"
            >
              <div className="flex flex-wrap gap-2">
                {allGenres.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No genres available
                  </p>
                ) : (
                  allGenres.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer border",
                        selectedGenres.has(genre)
                          ? "bg-primary/20 text-primary border-primary/30"
                          : "bg-white/10 text-muted-foreground hover:text-foreground hover:bg-white/20 border-white/10",
                      )}
                    >
                      {genre}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== Grid or empty filter state ===== */}
        {filtered.length > 0 ? (
          <>
            {/* Anime grid — paginated */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5 lg:gap-6">
              {paginated.map((anime) => (
                <AnimeCard
                  key={anime.id.anilist}
                  anime={anime}
                  variant="compact"
                  showTitleBelow
                  onOpen={handleCardOpen}
                />
              ))}
            </div>

            {/* ===== Pagination ===== */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[30vh] text-center">
            <p className="text-muted-foreground text-lg mb-4">
              No anime match your filters
            </p>
            <button
              onClick={resetFilters}
              className="h-10 px-6 bg-white/10 hover:bg-white/20 text-foreground rounded-xl transition-colors cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>
    </main>
    </>
  );
}
