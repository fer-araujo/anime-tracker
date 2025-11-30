"use client";

import Image from "next/image";
import { cn, getAspectClass } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Anime } from "@/types/anime";
import { ActionButton } from "@/components/common/Buttons";
import { useCallback, useEffect, useState } from "react";

type Props = {
  items: Anime[];
  intervalMs?: number;
  className?: string;
};

export function HeroCarouselCinematic({
  items,
  intervalMs = 8000,
  className,
}: Props) {
  const [index, setIndex] = useState(0);
  const [holdAutoplayUntil, setHoldAutoplayUntil] = useState(0);
  const router = useRouter();
  const total = items.length || 0;
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // auto-play
  useEffect(() => {
    if (total <= 1) return;
    if (prefersReducedMotion) return;

    const id = setInterval(() => {
      const now = Date.now();
      if (now < holdAutoplayUntil) return; // en pausa
      setIndex((i) => (i + 1) % total);
    }, intervalMs);
    return () => clearInterval(id);
  }, [total, intervalMs, holdAutoplayUntil, prefersReducedMotion]);

  // teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (total <= 1) return;
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % total);
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + total) % total);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  useEffect(() => {
    // precargar la siguiente imagen sin bloquear el render
    const nextIdx = (index + 1) % total;
    const nextSrc = items[nextIdx]?.backdrop ?? items[nextIdx]?.banner;
    // simple prefetch
    if (typeof nextSrc === "string") {
      const img = new window.Image();
      img.referrerPolicy = "no-referrer"; // por si TMDB
      img.src = nextSrc;
    }
  }, [index, total, items]);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % total);
    setHoldAutoplayUntil(Date.now() + 2500); // 2.5s de respiro tras la acción
  }, [total]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + total) % total);
    setHoldAutoplayUntil(Date.now() + 2500);
  }, [total]);

  const dotSelect = useCallback((i: number) => {
    setIndex(i);
    setHoldAutoplayUntil(Date.now() + 2500);
  }, []);

  const current = items[index];
  const aspect = current.artworkCandidates?.[0]?.aspect ?? null;
  const aspectClass = getAspectClass(aspect);
  
  const heroBackdrop =
    current.artworkCandidates?.[0]?.url_orig ??
    current.artworkCandidates?.[0]?.url_1280 ??
    current.artworkCandidates?.[0]?.url_780 ??
    current.banner ??
    current.backdrop ??
    current.poster ??
    null;

  const bestArtwork = current.artworkCandidates?.[0];
  const isWide =
    bestArtwork?.aspect &&
    bestArtwork.aspect > 1.3 &&
    bestArtwork.source !== "anilist-cover"; // o simplemente aspect > 1.3

  return (
    <>
      <section
        className={cn(
          "relative w-full h-[min(90vh,56vw)] overflow-hidden",
          className
        )}
      >
        {/* Slides */}
        <div
          className={`relative w-full overflow-hidden transition-transform duration-700 ease-out ${aspectClass}`}
        >
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={current?.id?.anilist ?? index}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.03 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              {/* Capa NÍTIDA principal */}
              {heroBackdrop && (
                <Image
                  src={heroBackdrop}
                  alt={current.title}
                  fill
                  priority={index === 0}
                  sizes="100vw"
                  className={cn(
                    "will-change-transform",
                    isWide
                      ? "object-cover object-center"
                      : "object-contain bg-black"
                  )}
                />
              )}

              {/* Vignettes para contraste/legibilidad */}
              <div className="absolute inset-y-0 left-0 w-[58vw] bg-[linear-gradient(90deg,rgba(0,0,0,0.82)_0%,rgba(0,0,0,0.48)_60%,transparent_100%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_70%_50%,rgba(0,0,0,0.10)_0%,rgba(0,0,0,0.22)_55%,rgba(0,0,0,0.50)_100%)]" />
              <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(0,0,0,0.55),rgba(0,0,0,0))]" />
            </motion.div>
          </AnimatePresence>
        </div>
        {/* Content */}
        <div className="absolute inset-0 z-10 flex items-end md:items-center justify-start">
          <div className="px-8 md:px-24 pb-10 md:pb-[14vh] max-w-4xl">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-white/80">
              {current.meta?.status && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 capitalize">
                  {current.meta.status}
                </span>
              )}
              {current.meta?.type && <span>{current.meta.type}</span>}
              {current.meta?.episodes ? (
                <span>{current.meta.episodes} eps</span>
              ) : null}
            </div>

            <h1 className="text-[clamp(2.2rem,5vw,4rem)] md:text-[clamp(2.8rem,4vw,4.5rem)] font-extrabold leading-[1.06] text-white drop-shadow-[0_8px_22px_rgba(0,0,0,0.65)]">
              {current.title}
            </h1>

            {current.meta?.genres?.length ? (
              <p className="mt-3 text-base text-white/90">
                {current.meta.genres.slice(0, 3).join(" · ")}
              </p>
            ) : null}

            {current.meta?.synopsisShort && (
              <p className="mt-4 text-[0.95rem] leading-relaxed text-white/90 max-w-[62ch] [display:-webkit-box] [-webkit-line-clamp:6] [-webkit-box-orient:vertical] overflow-hidden">
                {current.meta.synopsisShort}
              </p>
            )}
            <div className="mt-5 flex gap-3">
              <ActionButton
                onClick={() => router.push(`/anime/${current.id.anilist}`)}
              >
                Ver detalles
              </ActionButton>
              <ActionButton
                variant="soft"
                onClick={() =>
                  router.push(`/mi-lista?add=${current.id.anilist}`)
                }
              >
                Añadir
              </ActionButton>
            </div>
          </div>
        </div>
        {/* nav arrows */}
        {total > 1 && (
          <>
            {/* edge chevrons (hero & shelf) */}
            <button
              aria-label="Prev"
              onClick={prev}
              className="group absolute inset-y-0 left-0 z-20 w-[18vw] max-w-24 grid place-items-center hover:bg-white/[0.03] transition-colors
              sm:grid"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none text-white/70 group-hover:text-white
             text-3xl -translate-x-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
              >
                ‹
              </span>
            </button>
            <button
              aria-label="Next"
              onClick={next}
              className="group absolute inset-y-0 right-0 z-20 w-[18vw] max-w-24 grid place-items-center hover:bg-white/[0.03] transition-colors
              sm:grid"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none text-white/70 group-hover:text-white
             text-3xl -translate-x-1 drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
              >
                ›
              </span>
            </button>
          </>
        )}
        {/* progress + dots */}
        {total > 1 && (
          <div className="absolute left-0 right-0 bottom-0 z-20">
            <div className="h-[3px] w-full rounded-full overflow-hidden">
              <motion.div
                key={index}
                className="h-full"
                initial={{
                  width: prefersReducedMotion ? "100%" : "0%",
                  backgroundColor: "rgb(34 197 94)",
                }}
                animate={{ width: "100%", backgroundColor: "rgb(34 197 94)" }}
                transition={
                  prefersReducedMotion
                    ? undefined
                    : { duration: intervalMs / 1000, ease: "linear" }
                }
              />
            </div>
            <div className="absolute inset-x-0 bottom-8 z-20 flex items-center justify-center gap-2">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    dotSelect(i);
                  }}
                  className={cn(
                    "h-2.5 w-2.5 rounded-full transition-opacity",
                    i === index
                      ? "bg-white/90"
                      : "bg-white/50 hover:opacity-80 opacity-50"
                  )}
                  aria-label={`Ir al slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        )}
        {/* Fog / merge con la siguiente sección */}
        {/* seam mínimo y sutil */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0">
          {/* degradado suave para evitar corte duro */}
          <div className="h-[6vh] bg-[linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,0.12))]" />
          {/* Línea de contacto finísima (como Crunchy) */}
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-500/70" />
        </div>
      </section>
    </>
  );
}
