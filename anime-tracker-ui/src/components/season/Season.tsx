"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { fetchSeason } from "@/lib/api";
import type { Anime } from "@/types/anime";
import type { SeasonCatalogue, SeasonFormatKey } from "@/types/season";
import {
  buildFormatCounts,
  buildSeasonOptions,
  buildYearOptions,
  describeResults,
  filterByGenre,
  filterBySearch,
  getDefaultSeason,
  getDefaultYear,
  normalizeFormatKey,
  pickBackdrop,
  seasonLabel,
  selectByFormat,
  sortAnime,
  type SortKey,
} from "@/lib/season";
import { TrackableAnimeCard } from "@/components/season/TrackableAnimeCard";
import { SeasonFormatChips } from "@/components/season/SeasonFormatChips";
import { useBatchAnimeEntries } from "@/hooks/useBatchAnimeEntries";
import { useUserLists } from "@/hooks/useUserLists";
import GridSkeleton from "@/components/Loaders/GridSkeleton";
import Select, { type SelectOption } from "@/components/custom/Select";
import { Pagination } from "@/components/custom/Pagination";
import Icon from "@/components/custom/Icon";
import { cn } from "@/lib/utils";

const SORT_OPTIONS: SelectOption[] = [
  { value: "rating", label: "Rating" },
  { value: "popularity", label: "Popularidad" },
  { value: "title", label: "Título (A-Z)" },
];

// Colores base sutiles para el resplandor de temporada
const SEASON_COLORS: Record<string, string> = {
  WINTER: "from-blue-900/20 via-background to-background",
  SPRING: "from-pink-900/20 via-background to-background",
  SUMMER: "from-cyan-900/20 via-background to-background",
  FALL: "from-orange-900/20 via-background to-background",
};

/* -------------------------------------------------------------------------- */
/* SeasonPage                                                                */
/* -------------------------------------------------------------------------- */

type Props = {
  year?: string;
  season?: string;
};

export default function SeasonPage({
  year: yearProp,
  season: seasonProp,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const urlYear = searchParams.get("year") ?? yearProp ?? getDefaultYear();
  const urlSeason =
    (searchParams.get("season") ?? seasonProp ?? getDefaultSeason()).toUpperCase();

  /* ---- State ---- */
  const [catalogue, setCatalogue] = useState<SeasonCatalogue>({
    seasonal: [],
    leftovers: [],
  });
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
  const fetchData = useCallback(async (y?: string, s?: string) => {
    setLoading(true);
    setError(null);
    try {
      const opts: { year?: number; season?: string } = {};
      if (y) opts.year = Number(y);
      if (s) opts.season = s;
      const resp = await fetchSeason(opts);
      setCatalogue({
        seasonal: resp.data as Anime[],
        leftovers: (resp.leftovers ?? []) as Anime[],
      });
      setSeasonMeta({ season: resp.meta.season, year: resp.meta.year });
      setSelectedGenres(new Set());
      setSearchQuery("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load season data",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /* ---- Fetch on mount and URL change ---- */
  useEffect(() => {
    fetchData(urlYear, urlSeason);
  }, [urlYear, urlSeason, fetchData]);

  /* ---- Format chips ----
   * The chip lives in the URL next to `year` and `season` so a filtered season
   * survives a refresh and travels with a shared link. It is normalised against
   * the chips this response can actually serve: a bookmarked `?format=movie`
   * for a season with no films would otherwise render an empty page with no
   * control highlighted to explain why. */
  const formatChips = useMemo(() => buildFormatCounts(catalogue), [catalogue]);
  const activeFormat = normalizeFormatKey(
    searchParams.get("format"),
    formatChips,
  );

  const scoped = useMemo(
    () => selectByFormat(catalogue, activeFormat),
    [catalogue, activeFormat],
  );

  /* ---- Computed values ---- */
  // Genres come from the scoped list, not the whole season: offering a genre
  // that only exists among the movies while the TV chip is active produces a
  // filter combination that can only ever return nothing.
  const allGenres = useMemo(
    () => [...new Set(scoped.flatMap((a) => a.meta?.genres ?? []))].sort(),
    [scoped],
  );

  const filtered = useMemo(() => {
    let result = scoped;
    result = filterBySearch(result, searchQuery);
    result = filterByGenre(result, selectedGenres);
    result = sortAnime(result, sortBy);
    return result;
  }, [scoped, searchQuery, selectedGenres, sortBy]);

  // Reset to page 1 when data or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [scoped, searchQuery, selectedGenres, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(
    () => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, currentPage, pageSize],
  );

  /* ---- Tracking state, batched for the visible page ----
   * Scoped to `paginated` rather than the full season so the query stays
   * proportional to what's on screen. useBatchAnimeEntries keys off
   * animeIds.join(","), so this recomputes only when the page actually
   * changes — paging, filtering or sorting, not on every render. */
  const pageAnimeIds = useMemo(
    () => paginated.map((a) => a.id.anilist),
    [paginated],
  );
  const { entriesMap, refetch: refetchEntries } =
    useBatchAnimeEntries(pageAnimeIds);
  const { lists, refetch: refetchLists } = useUserLists();

  const listCountMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const list of lists) {
      for (const id of list.anime_ids) {
        map.set(id, (map.get(id) ?? 0) + 1);
      }
    }
    return map;
  }, [lists]);

  const handleTrackingChange = useCallback(() => {
    refetchEntries();
    refetchLists();
  }, [refetchEntries, refetchLists]);

  const seasonOptions = useMemo(() => buildSeasonOptions(), []);
  const yearOptions = useMemo(() => buildYearOptions(), []);

  /* ---- URL sync ---- */
  function updateSeasonParams(y: string, s: string) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("year", y);
    p.set("season", s);
    // A format chip belongs to the season it was counted from. Carrying it
    // across would land the user on a bucket that may not exist there.
    p.delete("format");
    router.replace(`/season?${p.toString()}`, { scroll: false });
  }

  const handleFormatChange = useCallback(
    (key: SeasonFormatKey) => {
      const p = new URLSearchParams(searchParams.toString());
      if (key === "all") p.delete("format");
      else p.set("format", key);
      router.replace(`/season?${p.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

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
  /* RENDER CORREGIDO Y PULIDO                                                */
  /* ========================================================================= */

  const activeGlow = SEASON_COLORS[seasonMeta?.season ?? "WINTER"] || SEASON_COLORS.WINTER;
  // Always the season's own backdrop, never the scoped list's: the hero should
  // not swap images every time a chip is pressed.
  const heroImage = pickBackdrop(catalogue.seasonal);
  const seasonHeading = seasonMeta && seasonMeta.year > 0
    ? `${seasonLabel(seasonMeta.season || "Desconocida")} ${seasonMeta.year}`
    : "Temporada";

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-32 px-6 md:px-10 lg:px-16 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="h-16 w-64 bg-white/5 rounded-lg animate-pulse mb-12" />
          <GridSkeleton variant="grid" count={20} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-6">
        <p className="text-white/50 text-lg mb-4">No se pudo cargar la temporada</p>
        <button
          type="button"
          onClick={retry}
          className="h-11 px-6 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background selection:bg-primary/30 pb-16">
      
      {/* ===== 1. HERO BACKDROP (Sin interponerse en la navegación) ===== */}
      <div className="absolute top-0 left-0 w-full h-[55vh] -z-10 pointer-events-none overflow-hidden">
        {heroImage && (
          <motion.img 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            transition={{ duration: 1.5 }}
            src={heroImage} 
            alt="Season Backdrop" 
            className="w-full h-full object-cover"
          />
        )}
        <div className={cn("absolute inset-0 bg-gradient-to-b opacity-90", activeGlow)} />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      <main className="relative z-10 max-w-3/4 mx-auto px-6 md:px-10 lg:px-16 pt-32 md:pt-40">
        
        {/* ===== 2. TÍTULO ===== */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 md:mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight drop-shadow-2xl">
            {seasonHeading}
          </h1>
          <p className="text-base md:text-lg text-white/60 mt-3 font-medium">
            {scoped.length > 0 ? (
              <>Mostrando {describeResults(activeFormat, scoped.length)}.</>
            ) : (
              "No hay lanzamientos para esta temporada."
            )}
          </p>
        </motion.div>

        {/* Formato: a ras del panel de filtros y de la rejilla de abajo, no de
            los controles que el panel lleva dentro. Los tres comparten el
            borde izquierdo del contenedor, así que la página conserva una sola
            línea vertical en lugar de dos separadas por el padding del panel. */}
        <SeasonFormatChips
          chips={formatChips}
          active={activeFormat}
          onChange={handleFormatChange}
          className="mb-6"
        />

        {/* ===== 3. PANEL DE FILTROS ESTÁTICO Y LIMPIO (Cero ruido visual) ===== */}
        {/* rounded-xl, no 2xl: el fondo de este panel es casi el mismo color
            que la página, así que lo único que dibuja su borde izquierdo es la
            curva de la esquina. A 20px esa curva se leía como sangría contra el
            borde recto del título y de la rejilla; a 12px va a juego con los
            pósters y con los chips. */}
        <div className="mb-10 p-4 md:p-5 rounded-xl bg-zinc-950/80 border border-white/5 shadow-xl">
          {/* Fila principal de filtros con flex-wrap real para que los Dropdowns NO se corten */}
          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            
            {/* Selects: Usando exactamente tu componente sin overflows que lo rompan */}
            <div className="w-[120px] md:w-[140px] z-30">
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

            <div className="w-[140px] md:w-[160px] z-30">
              <Select
                options={seasonOptions}
                value={urlSeason ?? seasonMeta?.season ?? ""}
                onChange={(s) => {
                  const y = urlYear || String(seasonMeta?.year ?? new Date().getFullYear());
                  updateSeasonParams(y, s);
                }}
                placeholder="Temporada"
              />
            </div>

            <div className="w-[160px] md:w-[180px] z-30">
              <Select
                options={SORT_OPTIONS}
                value={sortBy}
                onChange={(v) => setSortBy(v as SortKey)}
                placeholder="Ordenar"
              />
            </div>

            <div className="hidden lg:block w-px h-8 bg-white/10 mx-1" />

            {/* Input de Búsqueda */}
            <div className="flex-1 min-w-[200px] relative">
              <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Filtrar por título..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                spellCheck={false}
                className="h-10 w-full pl-9 pr-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl focus:bg-white/10 focus:border-primary/50 text-white placeholder:text-white/40 transition-colors outline-none text-sm"
              />
            </div>

            {/* Botones de Acción Rápida */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGenrePanelOpen((prev) => !prev)}
                className={cn(
                  "h-10 px-4 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 border cursor-pointer",
                  genrePanelOpen || selectedGenres.size > 0
                    ? "bg-primary/20 text-primary border-primary/30"
                    : "bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border-white/10",
                )}
              >
                <Icon name="Filter" size={16} />
                Géneros
                {selectedGenres.size > 0 && (
                  <span className="ml-1 text-[10px] bg-primary/30 px-1.5 py-0.5 rounded-full text-white">
                    {selectedGenres.size}
                  </span>
                )}
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="h-10 px-3 text-sm font-medium text-white/40 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Panel de Géneros Colapsable */}
          <AnimatePresence initial={false}>
            {genrePanelOpen && (
              <motion.div
                key="genre-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 pt-4 mt-4 border-t border-white/5">
                  {allGenres.length === 0 ? (
                    <p className="text-sm text-white/40">No hay géneros disponibles</p>
                  ) : (
                    allGenres.map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => toggleGenre(genre)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs transition-colors border cursor-pointer",
                          selectedGenres.has(genre)
                            ? "bg-primary text-white border-primary"
                            : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border-white/5",
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
        </div>

        {/* ===== 4. GRID DE ANIMES (Sin envolturas intrusivas) ===== */}
        {filtered.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5 lg:gap-6">
              {paginated.map((anime) => (
                <TrackableAnimeCard
                  key={anime.id.anilist}
                  anime={anime}
                  onOpen={handleCardOpen}
                  animeEntry={entriesMap.get(anime.id.anilist) ?? null}
                  listCount={listCountMap.get(anime.id.anilist) ?? 0}
                  onTrackingChange={handleTrackingChange}
                />
              ))}
            </div>

            {/* ===== PAGINACIÓN ===== */}
            <div className="mt-12">
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
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[30vh] text-center border border-dashed border-white/10 rounded-2xl bg-white/5 p-10 mt-8">
            <Icon name="Search" size={48} className="text-white/20 mb-4" />
            <p className="text-white/50 text-lg mb-4">No se encontraron animes con estos filtros.</p>
            <button
              type="button"
              onClick={resetFilters}
              className="h-10 px-6 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </main>
    </div>
  );
}