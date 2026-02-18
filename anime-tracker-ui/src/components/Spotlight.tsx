"use client";

import Image from "next/image";
import { cn, getAspectClass } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { Anime } from "@/types/anime";
import { ActionButton } from "@/components/common/Buttons";
import { useCallback, useEffect, useState } from "react";
import { Info, Plus } from "lucide-react";

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
    const nextSrc =
      items[nextIdx]?.images.backdrop ?? items[nextIdx]?.images.banner;
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
  const aspect = current.images.artworkCandidates?.[0]?.aspect ?? null;
  const aspectClass = getAspectClass(aspect);

  const heroBackdrop =
    current.images.banner ??
    current.images.backdrop ??
    current.images.artworkCandidates?.[0]?.url_orig ??
    current.images.artworkCandidates?.[0]?.url_1280 ??
    current.images.artworkCandidates?.[0]?.url_780 ??
    current.images.poster ??
    null;

  return (
    <>
      <section
        className={cn(
          "relative w-full h-[min(90vh,56vw)] overflow-hidden",
          className,
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
                  src={
                    current.images.backdrop ||
                    current.images.banner ||
                    current.images.poster ||
                    ""
                  }
                  alt={current.title}
                  fill
                  priority
                  // Next.js 15 soporta esto. Si tu linter se queja, es un falso positivo, pero renderizará bien.
                  // Esto elimina la compresión agresiva del 75%.
                  quality={95}
                  className={cn(
                    "object-cover transition-transform duration-700",
                    // UX IMPROVEMENT:
                    // Si es backdrop/banner, enfocamos al 20% superior para no cortar cabezas.
                    // Si es poster (vertical), centramos normal.
                    current.images.backdrop || current.images.banner
                      ? "object-[center_20%]"
                      : "object-center",
                  )}
                />
              )}

              <div className="absolute inset-0 bg-black/10" />
              {/* Nueva viñeta lateral izquierda para que el logo y el texto siempre tengan contraste */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/10 to-transparent w-[80%] md:w-[65%]" />
              <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,1)0%,rgba(0,0,0,0)65%)]" />
            </motion.div>
          </AnimatePresence>
        </div>
        {/* Content */}
        <div className="absolute inset-0 z-10 flex items-center justify-start">
          <div className="px-6 md:px-16 lg:px-24 pb-20 md:pb-32 w-full max-w-6xl space-y-4">
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
            {/* --- LOGO CINEMÁTICO --- */}
            {current.images?.logo ? (
              <motion.div
                key={`logo-${current.id.anilist}`}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="w-full max-w-[40vw] md:max-w-[25vw] lg:max-w-[30vw] mb-6"
              >
                <Image
                  src={current.images.logo}
                  alt={current.title}
                  width={800}
                  height={400}
                  className="w-auto h-20 md:h-32 lg:h-40 object-contain object-left-bottom drop-shadow-[0_8px_30px_rgba(0,0,0,0.9)]"
                  priority
                />
              </motion.div>
            ) : (
              // Fallback Título
              <motion.h2
                key={`title-${current.id.anilist}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-3xl md:text-5xl lg:text-6xl font-bold text-white drop-shadow-lg leading-tight mb-4"
              >
                {current.title}
              </motion.h2>
            )}
            {/* ----------------------- */}

            {/* Nueva fila de Metadatos (Año • Género • Rating) */}
            <div className="flex items-center gap-2 text-xs md:text-sm font-medium text-white/80 tracking-wide mb-1">
              {current.meta?.year && <span>{current.meta.year}</span>}
              {current.meta?.year && current.meta?.genres?.[0] && (
                <span className="text-white/40">•</span>
              )}

              {current.meta?.genres?.[0] && (
                <span>{current.meta.genres[0]}</span>
              )}
              {current.meta?.genres?.[0] && current.meta?.rating && (
                <span className="text-white/40">•</span>
              )}

              {current.meta?.rating && (
                <span className="flex items-center gap-1">
                  ⭐ {Number(current.meta.rating).toFixed(1)}
                </span>
              )}
            </div>

            <p className="mt-4 text-[0.95rem] leading-relaxed text-white/90 max-w-[62ch] [display:-webkit-box] [-webkit-line-clamp:6] [-webkit-box-orient:vertical] overflow-hidden">
              {current.meta?.synopsisShort || current.meta?.synopsis}
            </p>
            <div className="mt-5 flex gap-3">
              <ActionButton
                onClick={() => router.push(`/anime/${current.id.anilist}`)}
                icon={<Info size={14} />}
              >
                Ver detalles
              </ActionButton>
              <ActionButton
                variant="soft"
                onClick={() =>
                  router.push(`/mi-lista?add=${current.id.anilist}`)
                }
                icon={<Plus size={14} />}
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
                      : "bg-white/50 hover:opacity-80 opacity-50",
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
