import Image from "next/image";
import React from "react";
import { Card } from "@/components/ui/card";
import { ProviderBadge } from "./ProviderBadge";
import { uniqueNormalizedProviders } from "@/lib/providers";
import { cn } from "@/lib/utils";
import { Star, Heart, Info, Plus } from "lucide-react";

// ---------- Types ----------
export type Anime = {
  id: { anilist: number; tmdb: number | null };
  title: string;
  poster: string | null;
  providers: string[];
  meta?: {
    genres?: string[];
    rating?: number | null; // 0..10
    isAdult?: boolean;
    isNew?: boolean;
    status?: "ongoing" | "finished";
    studio?: string | null;
    type?: string | null; // TV / ONA / Movie / OVA / Special ...
    episodes?: number | null;
    progress?: number | null; // vistos
    nextAiring?: string | null; // e.g. "in 6 days" (texto ya formateado)
  };
};

export type AnimeCardProps = {
  anime: Anime;
  onOpen?: (anime: Anime) => void;
  onAddToList?: (anime: Anime) => void;
  onToggleFavorite?: (anime: Anime, next: boolean) => void;
  variant?: "default" | "compact";
  showTitleBelow?: boolean; // título fuera del card
  overlayTone?: "soft" | "strong"; // tono manual base
  autoContrast?: boolean; // detectar pósters claros automáticamente
};

/**
 * v3.6 "Hover-only overlay"
 * - Se elimina el filtro oscuro permanente. El degradé/blur SOLO aparece en hover.
 * - Auto-contrast se mantiene pero solo afecta el modo del overlay cuando aparece.
 * - Resto del layout sin cambios.
 */
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
  const [isFav, setFav] = React.useState(false);
  const [overlayMode, setOverlayMode] = React.useState<"base" | "ultra">("base");

  const heightCls = variant === "compact" ? "h-[18rem]" : "h-[22rem]";

  // ---- Derived / Dedup ----
  const genres = anime.meta?.genres ?? [];
  const ADULT_GENRES = new Set(["Hentai", "Ecchi"]);
  const adultByGenre = genres.some((g) => ADULT_GENRES.has(g));
  const isAdult = Boolean(anime.meta?.isAdult || adultByGenre);
  const status = anime.meta?.status; // "ongoing" | "finished" | undefined

  // ---- Handlers ----
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (!autoContrast) return;
    try {
      const img = e.currentTarget as HTMLImageElement;
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) return;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const sampleW = 120;
      const sampleH = 80; // zona superior
      canvas.width = sampleW;
      canvas.height = sampleH;
      ctx.drawImage(img, 0, 0, w, Math.max(1, Math.floor(h * 0.4)), 0, 0, sampleW, sampleH);
      const data = ctx.getImageData(0, 0, sampleW, sampleH).data;
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        sum += lum;
      }
      const avg = sum / (sampleW * sampleH);
      if (avg > 175) setOverlayMode("ultra");
      else setOverlayMode("base");
    } catch {
      // noop
    }
  };

  return (
    <div className="group relative w-full select-none">
      <Card
        className={cn(
          "relative w-full overflow-hidden rounded-2xl p-0",
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
              onLoad={handleImageLoad}
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
            "backdrop-blur-[4px] backdrop-saturate-[125%]",
            overlayMode === "ultra" || overlayTone === "strong"
              ? "bg-[linear-gradient(to_top,rgba(0,0,0,0.90)_0%,rgba(0,0,0,0.66)_52%,rgba(0,0,0,0.22)_100%)]"
              : "bg-[linear-gradient(to_top,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.48)_52%,rgba(0,0,0,0.14)_100%)]"
          )}
        >
          {/* Content */}
          <div className="relative z-10 flex h-full flex-col text-white">
            {/* Top: status pills (left) + score (right) */}
            <div className="flex items-start justify-between gap-2 px-3 pt-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {anime.meta?.isNew && <Pill tone="emerald">NEW</Pill>}
                {isAdult && <Pill tone="rose">+18</Pill>}
                {status === "ongoing" && (
                  <Pill tone="sky">Ongoing</Pill>
                )}
                {status === "finished" && (
                  <Pill tone="slate">Finished</Pill>
                )}
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
                <p className="text-xs text-white/70">Next {anime.meta.nextAiring}</p>
              )}
            </div>

            {/* Middle: genres */}
            {genres.length > 0 && (
              <p className="mt-2 px-3 text-[0.75rem] leading-5 text-white/95 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] line-clamp-1" title={genres.join(", ")}>
                {genres.slice(0, 3).join(" · ")}
              </p>
            )}

            {/* Bottom: providers + actions */}
            <div className="mt-auto flex flex-col gap-4 px-3 pb-3">
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {normalized.length > 0 ? (
                  normalized.map((lbl) => <ProviderBadge key={lbl} label={lbl} />)
                ) : (
                  <ProviderBadge label="Pirata" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <ActionButton onClick={() => onOpen?.(anime)} icon={<Info size={14} />}>Detalles</ActionButton>
                <ActionButton variant="soft" onClick={() => onAddToList?.(anime)} icon={<Plus size={14} />}>Añadir</ActionButton>
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
          <h4 className="text-[0.9rem] font-medium leading-tight text-white/95 line-clamp-2" title={anime.title}>
            {anime.title}
          </h4>
        </div>
      )}
    </div>
  );
}

// ---------- UI Partials ----------
function Pill({
  tone,
  children,
  ariaLabel,
}: {
  tone: "amber" | "rose" | "emerald" | "sky" | "slate";
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  const base = "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border";
  const map: Record<string, string> = {
    amber: "bg-gradient-to-r from-yellow-400/25 to-amber-500/25 text-yellow-100 border-yellow-400/35",
    rose: "bg-gradient-to-r from-rose-500/30 to-red-600/30 text-rose-50 border-rose-400/40",
    emerald: "bg-gradient-to-r from-emerald-500/25 to-teal-500/25 text-emerald-50 border-emerald-400/35",
    sky: "bg-gradient-to-r from-sky-500/35 to-cyan-500/35 text-sky-50 border-sky-300/45",
    slate: "bg-gradient-to-r from-slate-500/30 to-zinc-600/30 text-slate-50 border-slate-300/40",
  };
  return (
    <span className={cn(base, map[tone])} aria-label={ariaLabel}>
      {children}
    </span>
  );
}

function ScoreBadge({ value }: { value: number }) {
  const v = Math.max(0, Math.min(10, value));
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full pl-1.5 pr-2 py-1 text-xs font-semibold",
        "bg-black/65 border border-white/15 text-white shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
      )}
      aria-label={`Rating ${v.toFixed(1)}`}
    >
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/40 ring-1 ring-yellow-300/70">
        <Star size={12} className="text-yellow-300" strokeWidth={2} />
      </span>
      {v.toFixed(1)}
    </span>
  );
}

function ActionButton({
  children,
  onClick,
  variant = "solid",
  icon,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "solid" | "soft";
  icon?: React.ReactNode;
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-white border focus:outline-none focus:ring-2 focus:ring-white/40 transition-colors h-8 px-2.5";
  const styles =
    variant === "solid"
      ? "border-white/15 bg-white/10 hover:bg-white/15"
      : "border-white/15 bg-white/5 hover:bg-white/10";
  return (
    <button type="button" onClick={onClick} className={cn(base, styles)}>
      {icon}
      <span className="truncate">{children}</span>
    </button>
  );
}

function FavButton({ active, onClick }: { active: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-label={active ? "Quitar de favoritos" : "Agregar a favoritos"}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-lg text-white border transition-colors focus:outline-none focus:ring-2 h-8 w-8",
        active
          ? "border-pink-400/40 bg-pink-500/20 hover:bg-pink-500/25 focus:ring-pink-300/40"
          : "border-white/15 bg-white/5 hover:bg-white/10 focus:ring-white/40"
      )}
      title={active ? "Favorito" : "Agregar a favoritos"}
    >
      <Heart size={16} strokeWidth={1.8} className={cn(active ? "fill-pink-300 text-pink-300" : "text-white/80")} />
    </button>
  );
}

function PosterSkeleton({ title }: { title: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl bg-neutral-900">
      <div className="absolute inset-0 animate-pulse bg-[linear-gradient(90deg,rgba(255,255,255,0.04)_25%,rgba(255,255,255,0.08)_37%,rgba(255,255,255,0.04)_63%)] bg-[length:400%_100%]" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mb-2 h-10 w-10 opacity-40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M4 4h16v16H4z" />
          <path d="m4 15 4-4 4 4 4-4 4 4" />
        </svg>
        <span className="text-sm">{title}</span>
      </div>
    </div>
  );
}
