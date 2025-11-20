import Image from "next/image";
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { ProviderBadge } from "./ProviderBadge";
import { uniqueNormalizedProviders } from "@/lib/providers";
import { cn, handleImageLoad } from "@/lib/utils";
import { Info, Plus } from "lucide-react";
import { AnimeCardProps } from "@/types/anime";
import { Pill } from "./common/Pills";
import { ScoreBadge } from "./common/ScoreBadge";
import { ActionButton, FavButton } from "./common/Buttons";
import { PosterSkeleton } from "./Loaders/PosterSkeleton";

export function AnimeCard({
  anime,
  onOpen,
  onAddToList,
  onToggleFavorite,
  variant = "default",
  showTitleBelow = true,
  overlayTone = "soft",
  autoContrast = true,
}: AnimeCardProps) {
  const normalized = uniqueNormalizedProviders(anime.providers);
  const [isFav, setFav] = useState(false);
  const [overlayMode, setOverlayMode] = useState<"base" | "ultra">("base");

  const heightCls = variant === "compact" ? "h-[18rem]" : "h-[22rem]";

  // ---- Derived / Dedup ----
  const genres = anime.meta?.genres ?? [];
  const ADULT_GENRES = new Set(["Hentai", "Ecchi"]);
  const adultByGenre = genres.some((g) => ADULT_GENRES.has(g));
  const isAdult = Boolean(anime.meta?.isAdult || adultByGenre);
  const status = anime.meta?.status; // "ongoing" | "finished" | undefined

  return (
    <div className="group relative w-full select-none">
      <Card
        className={cn(
          "relative w-full overflow-hidden p-0 isolate rounded-md",
          heightCls,
          "border border-white/10 bg-neutral-950 transition-shadow duration-300 ease-out hover:shadow-[0_12px_36px_-12px_rgba(0,0,0,0.5)]"
        )}
      >
        {/* Poster */}
        <div className="absolute inset-0 z-0">
          {anime.poster ? (
            <Image
              src={anime.poster}
              alt={anime.title}
              fill
              sizes="(max-width:768px) 100vw, 33vw"
              className="object-cover [image-rendering:auto]"
              priority={false}
              onLoad={(e) => handleImageLoad(e, setOverlayMode, autoContrast)}
            />
          ) : (
            <PosterSkeleton title={anime.title} />
          )}
        </div>

        {/* Hover Overlay (contenido) */}
        <div
          className={cn(
            "absolute inset-0 z-[2]",
            // Hover: degradé + blur + leve extra opacidad
            "opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out",
            "backdrop-blur-[6px] backdrop-saturate-[125%]",
            overlayMode === "ultra" || overlayTone === "strong"
              ? "bg-[linear-gradient(to_top,rgba(0,0,0,0.90)_20%,rgba(0,0,0,0.66)_65%,rgba(0,0,0,0.52)_100%)]"
              : "bg-[linear-gradient(to_top,rgba(0,0,0,0.72)_20%,rgba(0,0,0,0.48)_65%,rgba(0,0,0,0.34)_100%)]"
          )}
        >
          {/* Content */}
          <div className="relative z-10 flex w-full h-full flex-col text-white">
            {/* Top: status pills (left) + score (right) */}
            <div className="flex items-start justify-between gap-2 px-3 pt-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {anime.meta?.isNew && <Pill tone="emerald">NEW</Pill>}
                {isAdult && <Pill tone="rose">+18</Pill>}
                {status === "ongoing" && <Pill tone="sky">Ongoing</Pill>}
                {status === "finished" && <Pill tone="slate">Finished</Pill>}
              </div>

              {typeof anime.meta?.rating === "number" && (
                <ScoreBadge value={anime.meta.rating} />
              )}
            </div>

            {/* Info block (studio / type / episodes) */}
            <div className="px-3 mt-2 flex flex-col gap-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-white/90 truncate">
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

            {/* Middle: genres */}
            {genres.length > 0 && (
              <p
                className="mt-2 px-3 text-[0.75rem] leading-5 text-white/95 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] line-clamp-1"
                title={genres.join(", ")}
              >
                {genres.slice(0, 3).join(" · ")}
              </p>
            )}
            {anime.meta?.synopsisShort && (
              <p
                className="mt-2 px-3 text-[0.78rem] leading-[1.25rem] text-white/90 [display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical] overflow-hidden drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]"
                title={anime.meta.synopsisShort}
              >
                {anime.meta.synopsisShort}
              </p>
            )}
            {/* Bottom: providers + actions */}
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
                  onClick={() => onOpen?.(anime)}
                  icon={<Info size={14} />}
                >
                  Detalles
                </ActionButton>
                <ActionButton
                  variant="soft"
                  onClick={() => onAddToList?.(anime)}
                  icon={<Plus size={14} />}
                >
                  Añadir
                </ActionButton>
                <FavButton
                  active={isFav}
                  onClick={() => {
                    const next = !isFav;
                    setFav(next);
                    onToggleFavorite?.(anime, next);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {showTitleBelow && (
        <div className="mt-2 px-1">
          <h4
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
