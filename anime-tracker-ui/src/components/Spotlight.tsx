"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from "framer-motion";
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
  // Estado para guardar dónde empezó a tocar el dedo el usuario (para el Swipe)
  const [touchStartX, setTouchStartX] = useState(0);

  const router = useRouter();
  const total = items.length || 0;
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const { scrollY } = useScroll();

  const heroY = useTransform(scrollY, [0, 800], ["0%", "20%"]);
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0.1]);
  const uiOpacity = useTransform(scrollY, [0, 500], [1, 0]);

  // auto-play
  useEffect(() => {
    if (total <= 1) return;
    if (prefersReducedMotion) return;

    const id = setInterval(() => {
      const now = Date.now();
      if (now < holdAutoplayUntil) return;
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
    const nextIdx = (index + 1) % total;
    const nextSrc =
      items[nextIdx]?.images.backdrop ?? items[nextIdx]?.images.banner;
    if (typeof nextSrc === "string") {
      const img = new window.Image();
      img.referrerPolicy = "no-referrer";
      img.src = nextSrc;
    }
  }, [index, total, items]);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % total);
    setHoldAutoplayUntil(Date.now() + 2500);
  }, [total]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + total) % total);
    setHoldAutoplayUntil(Date.now() + 2500);
  }, [total]);

  const dotSelect = useCallback((i: number) => {
    setIndex(i);
    setHoldAutoplayUntil(Date.now() + 2500);
  }, []);

  // --- LÓGICA DE SWIPE NATIVA ---
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const distance = touchStartX - touchEndX;

    // Si el dedo recorrió más de 50px a la izquierda o derecha, cambiamos de slide
    if (distance > 50) {
      next(); // Swipe hacia la izquierda -> Siguiente
    } else if (distance < -50) {
      prev(); // Swipe hacia la derecha -> Anterior
    }
  };

  const current = items[index];

  const heroBackdrop =
    current.images.backdrop ??
    current.images.banner ??
    current.images.artworkCandidates?.[0]?.url_orig ??
    current.images.artworkCandidates?.[0]?.url_1280 ??
    current.images.artworkCandidates?.[0]?.url_780 ??
    current.images.poster ??
    "";

  return (
    <>
      <section
        // Agregamos onTouchStart y onTouchEnd al contenedor principal para que toda el área detecte el swipe
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={cn(
          "relative h-[65vh] md:h-[80vh] w-full overflow-hidden bg-background",
          className,
        )}
      >
        {/* 1. CONTENEDOR PARALLAX */}
        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="absolute inset-0 w-full h-full z-0"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id.anilist}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              className="relative h-full w-full [mask-image:linear-gradient(to_bottom,black_70%,transparent_100%)]"
            >
              <Image
                src={heroBackdrop}
                alt={current.title}
                fill
                priority
                quality={95}
                className={cn(
                  "object-cover transition-transform duration-700",
                  heroBackdrop ? "object-[center_20%]" : "object-center",
                )}
              />

              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent w-[90%] md:w-[60%]" />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Content */}
        <motion.div
          style={{ opacity: uiOpacity }}
          className="absolute inset-0 z-10 flex items-center justify-start pointer-events-none"
        >
          {/* EL FIX DEL PADDING: 
              Agregamos `mt-24 md:mt-0` para empujar el contenido hacia abajo en celulares, 
              salvando el espacio que ocupa el Navbar flotante.
              Y le regresamos `pointer-events-auto` para que los botones sigan funcionando.
          */}
          <div className="px-6 md:px-16 lg:px-24 mt-24 md:mt-12 pb-16 md:pb-32 w-full max-w-6xl space-y-4 pointer-events-auto">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold tracking-widest uppercase">
              {current.meta?.status && (
                <span
                  className={cn(
                    "px-3 py-1 rounded-md border backdrop-blur-md transition-colors",
                    current.meta.status === "RELEASING"
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-white/5 text-white/50 border-white/10",
                  )}
                >
                  {current.meta.status === "RELEASING"
                    ? "En Emisión"
                    : "Finalizado"}
                </span>
              )}
              {current.meta?.type && (
                <span className="text-white/70 ml-2">{current.meta.type}</span>
              )}
              {current.meta?.episodes ? (
                <>
                  <span className="w-1 h-1 bg-white/30 rounded-full mx-1" />
                  <span className="text-white/70">
                    {current.meta.episodes} eps
                  </span>
                </>
              ) : null}
            </div>

            {/* --- LOGO CINEMÁTICO --- */}
            {current.images?.logo ? (
              <motion.div
                key={`logo-${current.id.anilist}`}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="w-full max-w-[45vw] md:max-w-[25vw] lg:max-w-[30vw] mb-6"
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

            {/* Fila de Metadatos */}
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
        </motion.div>

        <motion.div
          style={{ opacity: uiOpacity }}
          className="absolute inset-0 z-20 pointer-events-none"
        >
          {/* NAV ARROWS (Ocultas en mobile, visibles en md) */}
          {total > 1 && (
            <>
              <button
                aria-label="Anime anterior"
                onClick={prev}
                // EL FIX DE LAS FLECHAS: hidden md:grid
                className="hidden md:grid pointer-events-auto group absolute inset-y-0 left-0 w-[15vw] max-w-24 place-items-center transition-colors"
              >
                <span className="text-white/60 group-hover:text-white text-4xl cursor-pointer drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
                  ‹
                </span>
              </button>
              <button
                aria-label="Siguiente anime"
                onClick={next}
                // EL FIX DE LAS FLECHAS: hidden md:grid
                className="hidden md:grid pointer-events-auto group absolute inset-y-0 right-0 w-[15vw] max-w-24 place-items-center transition-colors"
              >
                <span className="text-white/60 group-hover:text-white text-4xl cursor-pointer drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
                  ›
                </span>
              </button>
            </>
          )}

          {/* INDICADORES PREMIUM (Pill Progress) */}
          {total > 1 && (
            <div className="absolute inset-x-0 bottom-6 md:bottom-8 flex items-center justify-center gap-3 pointer-events-auto">
              {items.map((_, i) => {
                const isActive = i === index;
                return (
                  <button
                    key={i}
                    onClick={() => dotSelect(i)}
                    aria-label={`Ir al slide ${i + 1}`}
                    className={cn(
                      "relative h-2 rounded-full overflow-hidden transition-all duration-500 ease-out",
                      isActive
                        ? "w-12 bg-white/30"
                        : "w-2.5 bg-white/50 hover:bg-white/80",
                    )}
                  >
                    {isActive && (
                      <motion.div
                        key={`progress-${index}`}
                        className="absolute inset-y-0 left-0 bg-primary shadow-[0_0_10px_rgba(16,185,129,0.9)]"
                        initial={{
                          width: prefersReducedMotion ? "100%" : "0%",
                        }}
                        animate={{ width: "100%" }}
                        transition={{
                          duration: prefersReducedMotion
                            ? 0
                            : intervalMs / 1000,
                          ease: "linear",
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* 2. EL FOG SUTIL */}
        <div className="absolute inset-x-0 bottom-0 h-[30vh] bg-gradient-to-t from-background via-background/50 to-transparent pointer-events-none z-10" />
      </section>
    </>
  );
}
