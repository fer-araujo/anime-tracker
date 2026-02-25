"use client";
import { useRef } from "react";
import type { Anime } from "@/types/anime";
import { cn } from "@/lib/utils";
import { AnimeCard } from "./AnimeCard";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export function MinimalShelf({
  title,
  items,
  className,
}: {
  title: string;
  items: Anime[];
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const card = 240; // width base de desktop
    el.scrollBy({ left: dir * card * 3, behavior: "smooth" });
  };

  const handleOpen = (anime: Anime) => {
    router.push(`/anime/${anime.id.anilist}`);
  };

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, margin: "-50px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={cn(
          "relative py-6 md:py-12", // Menos padding vertical en celular
          // Padding horizontal: muy poco en celular (px-4), pero mantiene tu diseño premium en md/lg
          "px-4 md:pl-[min(18vw,6rem)] md:pr-[min(18vw,6rem)] xl:px-8",
          className,
        )}
      >
        {/* --- FLECHAS (Ocultas en celular, visibles en md) --- */}
        <button
          onClick={() => scroll(-1)}
          className="hidden md:grid absolute inset-y-0 -left-16 z-10 w-[18vw] max-w-24 place-items-center transition-colors"
        >
          <span className="text-white/60 hover:text-white text-4xl cursor-pointer -translate-x-1">
            ‹
          </span>
        </button>
        <button
          onClick={() => scroll(1)}
          className="hidden md:grid absolute inset-y-0 -right-16 z-10 w-[18vw] max-w-24 place-items-center transition-colors"
        >
          <span className="text-white/60 hover:text-white text-4xl cursor-pointer translate-x-1">
            ›
          </span>
        </button>

        {/* --- TÍTULO --- */}
        <div className="mb-3 md:mb-4 px-1 md:px-0">
          <h2 className="text-lg md:text-2xl font-semibold text-white/95">
            {title}
          </h2>
        </div>

        {/* --- CARDS CARRUSEL --- */}
        <div
          ref={ref}
          // En mobile quitamos el padding extra interno (px-0) porque ya lo dimos en el section
          className="flex gap-3 md:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory px-1 md:px-4
                   [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((a) => (
            <div
              key={`${a.id.anilist}-${a.id.tmdb ?? "x"}`}
              // LA MAGIA MOBILE:
              // w-36 (144px) en celular (caben ~2.5)
              // w-48 (192px) en tablets (sm)
              // w-60 (240px) en laptops/desktop (md)
              className="snap-start shrink-0 w-[140px] sm:w-48 md:w-60"
            >
              <AnimeCard
                anime={a}
                showTitleBelow
                onOpen={() => handleOpen(a)}
                // Variante compacta solo para mobile, default para desktop
                variant="default" // Puedes cambiar esto si en mobile lo ves muy alargado
              />
            </div>
          ))}
        </div>
      </motion.section>
    </>
  );
}
