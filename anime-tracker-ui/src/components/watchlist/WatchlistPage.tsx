"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/providers/AuthProvider";
import { useWatchlistList } from "@/hooks/useWatchlistList";
import { fetchAnimeBatch } from "@/lib/fetchAnimeBatch";
import { cn } from "@/lib/utils";
import Icon from "@/components/custom/Icon";
import { PosterSkeleton } from "@/components/Loaders/PosterSkeleton";
import type { WatchlistStatus } from "@/types/anime";

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

type TabKey = "all" | WatchlistStatus;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "plan_to_watch", label: "Plan to Watch" },
  { key: "watching", label: "Viendo" },
  { key: "completed", label: "Completados" },
  { key: "on_hold", label: "En pausa" },
  { key: "dropped", label: "Abandonados" },
];

const EMPTY_MESSAGES: Record<TabKey, { title: string; description: string }> = {
  all: {
    title: "Tu lista está vacía",
    description: "Explora la temporada actual y añade animes a tu lista.",
  },
  plan_to_watch: {
    title: "Sin pendientes",
    description: "Marca animes como «Plan to Watch» para verlos después.",
  },
  watching: {
    title: "No estás viendo nada",
    description: "Empieza a ver un anime y márcalo como «Viendo».",
  },
  completed: {
    title: "Sin completados",
    description: "Los animes que termines aparecerán aquí.",
  },
  on_hold: {
    title: "Sin animes en pausa",
    description: "Si dejas un anime en pausa, lo verás aquí.",
  },
  dropped: {
    title: "Sin abandonados",
    description: "Los animes que abandones aparecerán aquí.",
  },
};

/* -------------------------------------------------------------------------- */
/*  Anime Grid Card (lightweight for watchlist page)                           */
/* -------------------------------------------------------------------------- */

function WatchlistGridCard({
  animeId,
  title,
  poster,
  status,
  score,
  favorite,
}: {
  animeId: number;
  title: string;
  poster: string | null;
  status: WatchlistStatus;
  score: number | null;
  favorite: boolean;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(`/anime/${animeId}`)}
      className="group relative w-full aspect-[3/4] rounded-md overflow-hidden border border-white/10 bg-neutral-950 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
    >
      {poster ? (
        <Image
          src={poster}
          alt={title}
          fill
          sizes="(max-width:640px) 50vw, (max-width:1024px) 25vw, 16vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <PosterSkeleton title={title} />
      )}

      {/* Status badge */}
      <div className="absolute top-2 left-2 z-10">
        <span
          className={cn(
            "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border",
            status === "watching" &&
              "border-sky-500/40 text-sky-300 bg-sky-500/10",
            status === "completed" &&
              "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
            status === "plan_to_watch" &&
              "border-white/20 text-white/60 bg-white/5",
            status === "on_hold" &&
              "border-amber-500/40 text-amber-300 bg-amber-500/10",
            status === "dropped" &&
              "border-red-500/40 text-red-300 bg-red-500/10",
          )}
        >
          {status === "plan_to_watch"
            ? "Pendiente"
            : status === "watching"
              ? "Viendo"
              : status === "completed"
                ? "Completado"
                : status === "on_hold"
                  ? "Pausa"
                  : "Abandonado"}
        </span>
      </div>

      {/* Favorite heart */}
      {favorite && (
        <div className="absolute top-2 right-2 z-10">
          <Icon
            name="Heart"
            size={14}
            className="text-pink-300 fill-pink-300"
          />
        </div>
      )}

      {/* Score */}
      {score != null && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded">
          <Icon name="Star" size={10} className="fill-primary text-primary" />
          <span className="text-[10px] font-bold text-white">{score}</span>
        </div>
      )}

      {/* Gradient overlay + title */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 p-2.5">
        <h3 className="text-xs font-semibold text-white leading-tight line-clamp-2 drop-shadow-lg">
          {title}
        </h3>
      </div>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Page                                                                  */
/* -------------------------------------------------------------------------- */

export default function WatchlistPageClient() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const { items, loading, error } = useWatchlistList();

  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [animeData, setAnimeData] = useState<
    Map<number, { title: string; poster: string | null }>
  >(new Map());
  const [animeLoading, setAnimeLoading] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth?redirect=/watchlist");
    }
  }, [user, authLoading, router]);

  // Fetch anime data from API when items change
  useEffect(() => {
    if (items.length === 0) return;

    const ids = items.map((e) => e.anime_id).filter((id) => !animeData.has(id));

    if (ids.length === 0) return;

    setAnimeLoading(true);
    fetchAnimeBatch(ids)
      .then((data) => {
        setAnimeData((prev) => {
          const next = new Map(prev);
          data.forEach((v, k) => next.set(k, v));
          return next;
        });
      })
      .finally(() => setAnimeLoading(false));
  }, [items, animeData]);

  // Filter by tab
  const filteredItems = useMemo(() => {
    if (activeTab === "all") return items;
    return items.filter((e) => e.status === activeTab);
  }, [items, activeTab]);

  /* ---- Loading ---- */
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Icon name="Loader2" size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  /* ---- Main ---- */
  return (
    <div className="min-h-screen pt-24 px-6 md:px-10 lg:px-16 pb-16 bg-background">
      {/* Background */}
      <div
        className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-background" />
        <div className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-8">
          Mi Watchlist
        </h1>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-2 mb-8">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer border",
                activeTab === tab.key
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "bg-white/5 text-white/60 border-white/10 hover:text-white hover:bg-white/10",
              )}
            >
              {tab.label}
              {tab.key !== "all" && (
                <span className="ml-2 text-xs text-white/40">
                  {items.filter((e) => e.status === tab.key).length}
                </span>
              )}
              {tab.key === "all" && (
                <span className="ml-2 text-xs text-white/40">
                  {items.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {(loading || animeLoading) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-md bg-white/5 animate-shimmer"
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <Icon name="AlertCircle" size={32} className="text-red-400 mb-4" />
            <p className="text-muted-foreground text-lg mb-2">
              Error al cargar la lista
            </p>
            <p className="text-sm text-white/40">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
            <Icon name="List" size={40} className="text-white/20 mb-4" />
            <p className="text-white/60 text-lg font-medium mb-1">
              {EMPTY_MESSAGES[activeTab].title}
            </p>
            <p className="text-white/40 text-sm max-w-sm">
              {EMPTY_MESSAGES[activeTab].description}
            </p>
            {activeTab === "all" && (
              <button
                type="button"
                onClick={() => router.push("/season")}
                className="mt-6 h-10 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all cursor-pointer"
              >
                Explorar temporada
              </button>
            )}
          </div>
        )}

        {/* Grid */}
        {!loading && !error && filteredItems.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredItems.map((entry) => {
              const data = animeData.get(entry.anime_id);
              return (
                <WatchlistGridCard
                  key={entry.id}
                  animeId={entry.anime_id}
                  title={data?.title ?? `Anime #${entry.anime_id}`}
                  poster={data?.poster ?? null}
                  status={entry.status}
                  score={entry.score}
                  favorite={entry.favorite}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
