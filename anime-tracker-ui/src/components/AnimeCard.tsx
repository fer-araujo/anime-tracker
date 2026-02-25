"use client";
import Image from "next/image";
import React, { useState } from "react";
// Adiós shadcn, hola componentes limpios
import { ProviderBadge } from "./ProviderBadge";
import { uniqueNormalizedProviders } from "@/lib/providers";
import { cn, handleImageLoad } from "@/lib/utils";
import { Info, Plus } from "lucide-react"; // <-- Agregué Palette para el estudio
import { AnimeCardProps } from "@/types/anime";
import { Pill } from "./common/Pills";
import { ScoreBadge } from "./common/ScoreBadge";
import { ActionButton, FavButton } from "./common/Buttons";
import { PosterSkeleton } from "./Loaders/PosterSkeleton";
import * as Tooltip from "@radix-ui/react-tooltip";

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

  const genres = anime.meta?.genres ?? [];
  const ADULT_GENRES = new Set(["Hentai", "Ecchi"]);
  const adultByGenre = genres.some((g) => ADULT_GENRES.has(g));
  const isAdult = Boolean(anime.meta?.isAdult || adultByGenre);
  const status = anime.meta?.status;

  // A11Y: Manejador para el teclado (Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // EL FIX: Solo abrimos los detalles si el foco está EXACTAMENTE en la tarjeta principal.
    // Si el usuario dio Tab y está encima de "Añadir", e.target no será e.currentTarget,
    // por lo que ignoramos este evento y dejamos que el botón "Añadir" haga su propio trabajo.
    if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onOpen?.(anime);
    }
  };

  return (
    <div className="group relative w-full select-none">
      {/* A11Y MEJORAS:
        - tabIndex={0}: Permite enfocar con el teclado.
        - role="button": Le dice al lector de pantalla que esto es clickeable.
        - aria-label: Le lee el título al usuario ciego en lugar de hacerle leer todo el HTML.
        - onKeyDown: Permite "hacer clic" con la tecla Enter.
        - focus-visible:ring...: Dibuja un borde elegante SOLO cuando se usa teclado.
      */}
      <div
        tabIndex={0}
        role="button"
        aria-label={`Ver detalles de ${anime.title}`}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative w-full overflow-hidden p-0 isolate rounded-md cursor-pointer",
          // ¡LA MAGIA! En lugar de altura fija, usamos proporción
          variant === "compact" ? "aspect-[3/4]" : "aspect-[2/3]",
          "border border-white/10 bg-neutral-950 transition-all duration-300 ease-out md:hover:shadow-[0_12px_36px_-12px_rgba(0,0,0,0.5)]",
          // A11Y: Anillo de foco (Focus Ring) elegante
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950",
        )}
        onClick={() => {
          // En mobile o en desktop, si hacen clic en la tarjeta (no en un botón interno), se abre
          onOpen?.(anime);
        }}
      >
        {/* Poster */}
        <div className="absolute inset-0 z-0">
          {anime.images.poster ? (
            <Image
              src={anime.images.poster}
              alt={`Póster de ${anime.title}`} // A11Y: alt más descriptivo
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

        {/* OVERLAY: Oculto en mobile (opacity-0), visible en Desktop (md:group-hover:opacity-100) */}
        <div
          className={cn(
            "absolute inset-0 z-[2]",
            // A11Y: Aseguramos que el overlay se muestre también cuando la tarjeta tiene foco (group-focus-within)
            "opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity duration-300 ease-out",
            "backdrop-blur-[6px] backdrop-saturate-[125%]",
            overlayMode === "ultra" || overlayTone === "strong"
              ? "bg-[linear-gradient(to_top,rgba(0,0,0,0.90)_20%,rgba(0,0,0,0.66)_65%,rgba(0,0,0,0.52)_100%)]"
              : "bg-[linear-gradient(to_top,rgba(0,0,0,0.72)_20%,rgba(0,0,0,0.48)_65%,rgba(0,0,0,0.34)_100%)]",
          )}
        >
          {/* Contenido del Overlay (Añadido hidden md:flex para que no interfiera en celulares) */}
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

            {/* Info block: ESTUDIO DE VUELTA A SU LUGAR */}
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

            {/* Sinopsis */}
            {anime.meta?.synopsisShort && (
              <Tooltip.Provider delayDuration={300}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    {/* EL FIX REAL: Cambiamos <p> por <button> y le agregamos text-left y w-full 
                        para que se siga viendo exactamente igual que un párrafo, pero siendo semánticamente correcto. */}
                    <button className="mt-2 px-3 w-full text-left text-[0.78rem] leading-[1.25rem] text-white/90 [display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical] overflow-hidden drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)] cursor-help focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 rounded-sm">
                      {anime.meta.synopsisShort}
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      side="bottom"
                      align="center"
                      sideOffset={8}
                      className={cn(
                        "z-[100] max-w-xs md:max-w-sm overflow-hidden rounded-md border border-white/10 bg-neutral-950/95 px-4 py-3 text-xs leading-relaxed text-white/90 shadow-2xl backdrop-blur-md",
                        "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
                      )}
                    >
                      {anime.meta.synopsis || anime.meta.synopsisShort}
                      <Tooltip.Arrow
                        className="fill-white/10"
                        width={12}
                        height={6}
                      />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </Tooltip.Provider>
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
                {/* 1. Quitamos los tabIndex={-1} para devolverles la vida */}
                <ActionButton
                  variant="soft"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen?.(anime);
                  }}
                  icon={<Info size={14} />}
                >
                  Detalles
                </ActionButton>
                <ActionButton
                  variant="soft"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToList?.(anime);
                  }}
                  icon={<Plus size={14} />}
                >
                  Añadir
                </ActionButton>
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
            // A11Y: aria-hidden porque el título ya lo lee el lector de pantalla en la tarjeta principal
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
