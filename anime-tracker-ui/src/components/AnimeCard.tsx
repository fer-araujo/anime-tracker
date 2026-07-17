"use client";
import Image from "next/image";
import React, { useState, useRef, useEffect } from "react";
// Adiós shadcn, hola componentes limpios
import { ProviderBadge } from "./ProviderBadge";
import { uniqueNormalizedProviders } from "@/lib/providers";
import { cn, handleImageLoad } from "@/lib/utils";
import type { AnimeCardProps, WatchlistStatus } from "@/types/anime";
import { Pill } from "./common/Pills";
import { ScoreBadge } from "./common/ScoreBadge";
import { ActionButton, FavButton } from "./common/Buttons";
import { PosterSkeleton } from "./Loaders/PosterSkeleton";
import Tooltip from "@/components/custom/Tooltip";
import Icon from "@/components/custom/Icon";

/* -------------------------------------------------------------------------- */
/*  Status helpers                                                             */
/* -------------------------------------------------------------------------- */

const STATUS_LABELS: Record<WatchlistStatus, string> = {
  plan_to_watch: "Plan to Watch",
  watching: "Watching",
  completed: "Completed",
  on_hold: "On Hold",
  dropped: "Dropped",
};

const STATUS_COLORS: Record<WatchlistStatus, string> = {
  plan_to_watch: "border-white/20 text-white/60 bg-white/5",
  watching: "border-sky-500/40 text-sky-300 bg-sky-500/10",
  completed: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  on_hold: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  dropped: "border-red-500/40 text-red-300 bg-red-500/10",
};

/* -------------------------------------------------------------------------- */
/*  StatusDropdown — compact inline picker                                     */
/* -------------------------------------------------------------------------- */

function StatusDropdown({
  current,
  onSelect,
  onRemove,
}: {
  current: WatchlistStatus | null;
  onSelect: (status: WatchlistStatus) => void;
  onRemove?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const statuses: WatchlistStatus[] = [
    "plan_to_watch",
    "watching",
    "completed",
    "on_hold",
    "dropped",
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border transition-colors cursor-pointer",
          current
            ? STATUS_COLORS[current]
            : "border-white/15 text-white/60 bg-white/5 hover:bg-white/10",
        )}
        aria-label="Cambiar estado"
      >
        {current ? STATUS_LABELS[current] : "Añadir"}
        <Icon name="ChevronDown" size={10} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-[140px] rounded-lg border border-white/10 bg-neutral-900/95 backdrop-blur-2xl shadow-xl shadow-black/40 py-1 z-50">
          {statuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(s);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                s === current
                  ? "text-primary bg-primary/10"
                  : "text-white/70 hover:text-white hover:bg-white/5",
              )}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
          {current && onRemove && (
            <>
              <div className="my-1 h-px bg-white/10" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                Quitar de lista
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  AnimeCard                                                                  */
/* -------------------------------------------------------------------------- */

export function AnimeCard({
  anime,
  onOpen,
  onAddToList,
  onToggleFavorite,
  watchlistEntry,
  onStatusChange,
  variant = "default",
  showTitleBelow = true,
  overlayTone = "soft",
  autoContrast = true,
}: AnimeCardProps) {
  const normalized = uniqueNormalizedProviders(anime.providers);
  const [isFav, setFav] = useState(watchlistEntry?.favorite ?? false);
  const [overlayMode, setOverlayMode] = useState<"base" | "ultra">("base");

  // Sync favorite state when watchlistEntry changes
  useEffect(() => {
    setFav(watchlistEntry?.favorite ?? false);
  }, [watchlistEntry?.favorite]);

  const genres = anime.meta?.genres ?? [];
  const ADULT_GENRES = new Set(["Hentai", "Ecchi"]);
  const adultByGenre = genres.some((g) => ADULT_GENRES.has(g));
  const isAdult = Boolean(anime.meta?.isAdult || adultByGenre);
  const status = anime.meta?.status;

  // A11Y: Manejador para el teclado (Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onOpen?.(anime);
    }
  };

  const handleStatusChange = (newStatus: WatchlistStatus) => {
    onStatusChange?.(anime, newStatus);
  };

  return (
    <div className="group relative w-full select-none">
      <div
        tabIndex={0}
        role="button"
        aria-label={`Ver detalles de ${anime.title}`}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative w-full overflow-hidden p-0 isolate rounded-md cursor-pointer",
          variant === "compact" ? "aspect-[3/4]" : "aspect-[2/3]",
          "border border-white/10 bg-neutral-950 transition-all duration-300 ease-out md:hover:shadow-[0_12px_36px_-12px_rgba(0,0,0,0.5)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950",
        )}
        onClick={() => {
          onOpen?.(anime);
        }}
      >
        {/* Poster */}
        <div className="absolute inset-0 z-0">
          {anime.images.poster ? (
            <Image
              src={anime.images.poster}
              alt={`Póster de ${anime.title}`}
              fill
              sizes="(max-width:980px) 100vw, 33vw"
              className="object-cover [image-rendering:auto]"
              priority={false}
              onLoad={(e) => handleImageLoad(e, setOverlayMode, autoContrast)}
            />
          ) : (
            <PosterSkeleton title={anime.title} />
          )}
        </div>

        {/* OVERLAY */}
        <div
          className={cn(
            "absolute inset-0 z-[2]",
            "opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity duration-300 ease-out",
            "backdrop-blur-[6px] backdrop-saturate-[125%]",
            overlayMode === "ultra" || overlayTone === "strong"
              ? "bg-[linear-gradient(to_top,rgba(0,0,0,0.90)_20%,rgba(0,0,0,0.66)_65%,rgba(0,0,0,0.52)_100%)]"
              : "bg-[linear-gradient(to_top,rgba(0,0,0,0.72)_20%,rgba(0,0,0,0.48)_65%,rgba(0,0,0,0.34)_100%)]",
          )}
        >
          <div className="relative z-10 hidden md:flex w-full h-full flex-col text-white">
            <div className="flex items-start justify-between gap-2 px-3 pt-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {anime.meta?.isNew && <Pill tone="emerald">NEW</Pill>}
                {isAdult && <Pill tone="rose">+18</Pill>}
                {status === "RELEASING" && <Pill tone="sky">Ongoing</Pill>}
                {status === "FINISHED" && <Pill tone="slate">Finished</Pill>}
              </div>
              {typeof anime.meta?.rating === "number" && (
                <ScoreBadge value={anime.meta.rating} />
              )}
            </div>

            {/* Info block */}
            <div className="px-3 mt-2 flex flex-col gap-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white/90 truncate flex items-center gap-1.5">
                  {anime.meta?.studio ?? "Unknown Studio"}
                </span>
                <span className="text-xs text-white/70 ml-2 shrink-0">
                  {anime.meta?.type ?? ""}
                  {anime.meta?.episodes ? (
                    <>
                      {anime.meta?.type ? " · " : ""}
                      {anime.meta.progress != null
                        ? `Ep ${anime.meta.progress}/${anime.meta.episodes}`
                        : `${anime.meta.episodes} eps`}
                    </>
                  ) : null}
                </span>
              </div>
              {anime.meta?.nextAiring && (
                <p className="text-xs text-white/70">
                  Next {anime.meta.nextAiring}
                </p>
              )}
            </div>

            {genres.length > 0 && (
              <p
                className="mt-2 px-3 text-[0.75rem] leading-5 text-white/95 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] line-clamp-1"
                title={genres.join(", ")}
              >
                {genres.slice(0, 3).join(" · ")}
              </p>
            )}

            {/* Synopsis */}
            {anime.meta?.synopsisShort && (
              <Tooltip
                content={anime.meta.synopsis || anime.meta.synopsisShort}
                side="bottom"
                synopsisLang={anime.meta?.synopsisLang ?? null}
              >
                <button className="mt-2 px-3 w-full text-left text-[0.78rem] leading-[1.25rem] text-white/90 [display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical] overflow-hidden drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)] cursor-help focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 rounded-sm">
                  {anime.meta.synopsisShort}
                </button>
              </Tooltip>
            )}

            <div className="mt-auto flex flex-col gap-4 px-3 pb-3">
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {normalized.length > 0 ? (
                  normalized.map((lbl) => (
                    <ProviderBadge key={lbl} label={lbl} />
                  ))
                ) : (
                  <ProviderBadge label="Pirata" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <ActionButton
                  variant="soft"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen?.(anime);
                  }}
                  icon={<Icon name="Info" size={14} />}
                >
                  Detalles
                </ActionButton>

                {/* Status dropdown or Add button */}
                {onStatusChange ? (
                  <StatusDropdown
                    current={watchlistEntry?.status ?? null}
                    onSelect={handleStatusChange}
                  />
                ) : (
                  <ActionButton
                    variant="soft"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToList?.(anime);
                    }}
                    icon={<Icon name="Plus" size={14} />}
                  >
                    Añadir
                  </ActionButton>
                )}

                {/* Score badge when completed */}
                {watchlistEntry?.status === "completed" &&
                  watchlistEntry.score != null && (
                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                      {watchlistEntry.score}/10
                    </span>
                  )}

                <FavButton
                  active={isFav}
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = !isFav;
                    setFav(next);
                    onToggleFavorite?.(anime, next);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showTitleBelow && (
        <div className="mt-2 px-1">
          <h4
            aria-hidden="true"
            className="text-[0.9rem] font-normal leading-tight text-white/95 line-clamp-2"
            title={anime.title}
          >
            {anime.title}
          </h4>
        </div>
      )}
    </div>
  );
}
