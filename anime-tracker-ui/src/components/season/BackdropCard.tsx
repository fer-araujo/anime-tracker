"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { ScoreBadge } from "@/components/common/ScoreBadge";
import type { Anime } from "@/types/anime";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type BackdropCardProps = {
  anime: Anime;
  onOpen: (anime: Anime) => void;
};

/* -------------------------------------------------------------------------- */
/*  BackdropCard                                                               */
/* -------------------------------------------------------------------------- */

export function BackdropCard({ anime, onOpen }: BackdropCardProps) {
  const imageSrc =
    anime.images.backdrop ??
    anime.images.banner ??
    anime.images.poster ??
    null;

  const genres = anime.meta?.genres?.slice(0, 2) ?? [];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onOpen(anime);
    }
  };

  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={`Ver detalles de ${anime.title}`}
      onClick={() => onOpen(anime)}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative aspect-video rounded-xl overflow-hidden cursor-pointer group",
        "border border-white/10 bg-neutral-900",
        "transition-transform duration-200 motion-reduce:transition-none",
        "group-hover:scale-[1.02] motion-reduce:group-hover:scale-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950",
      )}
    >
      {/* Image */}
      <div className="absolute inset-0">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={`Fondo de ${anime.title}`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:group-hover:scale-100 motion-reduce:transition-none"
            sizes="(max-width: 640px) 280px, 340px"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900" />
        )}
      </div>

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      {/* Info panel — slides up on hover */}
      <div className="absolute inset-x-0 bottom-0 p-4 translate-y-2 group-hover:translate-y-0 transition-transform duration-300 motion-reduce:translate-y-0">
        {/* Title */}
        <h3 className="text-lg font-bold text-white truncate drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
          {anime.title}
        </h3>

        {/* Rating + genre pills */}
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {typeof anime.meta?.rating === "number" && (
            <ScoreBadge value={anime.meta.rating} />
          )}
          {genres.map((g) => (
            <span
              key={g}
              className="text-[0.7rem] px-2 py-0.5 rounded-full bg-white/15 text-white/90 font-medium backdrop-blur-xs border border-white/10"
            >
              {g}
            </span>
          ))}
        </div>

        {/* Studio */}
        {anime.meta?.studio && (
          <p className="text-xs text-white/70 mt-1.5 truncate">
            {anime.meta.studio}
          </p>
        )}
      </div>
    </div>
  );
}
