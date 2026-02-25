"use client";
import { useRef, useId } from "react"; // <-- Agregamos useId para accesibilidad
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
  const ref = useRef<HTMLUListElement | null>(null); // <-- Cambiamos a HTMLUListElement
  const router = useRouter();

  // A11Y: Generamos un ID único por cada shelf para vincular el título con la sección
  const titleId = useId();

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const card = 240;
    el.scrollBy({ left: dir * card * 3, behavior: "smooth" });
  };

  const handleOpen = (anime: Anime) => {
    router.push(`/anime/${anime.id.anilist}`);
  };

  return (
    <>
      <motion.section
        // A11Y: Le decimos al lector que esta sección se llama como el título
        aria-labelledby={titleId}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, margin: "-50px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={cn(
          "relative py-6 md:py-12",
          "px-4 md:pl-[min(18vw,6rem)] md:pr-[min(18vw,6rem)] xl:px-8",
          className,
        )}
      >
        {/* --- FLECHAS --- */}
        <button
          // A11Y: Etiquetas claras y ring para cuando se enfoquen con el teclado
          aria-label="Desplazar a la izquierda"
          onClick={() => scroll(-1)}
          className="hidden md:grid absolute inset-y-0 -left-16 z-10 w-[18vw] max-w-24 place-items-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span
            aria-hidden="true"
            className="text-white/60 hover:text-white text-4xl cursor-pointer -translate-x-1"
          >
            ‹
          </span>
        </button>
        <button
          aria-label="Desplazar a la derecha"
          onClick={() => scroll(1)}
          className="hidden md:grid absolute inset-y-0 -right-16 z-10 w-[18vw] max-w-24 place-items-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span
            aria-hidden="true"
            className="text-white/60 hover:text-white text-4xl cursor-pointer translate-x-1"
          >
            ›
          </span>
        </button>

        {/* --- TÍTULO --- */}
        <div className="mb-3 md:mb-4 px-1 md:px-0">
          <h2
            id={titleId}
            className="text-lg md:text-2xl font-semibold text-white/95"
          >
            {title}
          </h2>
        </div>

        {/* --- CARDS CARRUSEL --- */}
        <ul
          ref={ref}
          // A11Y: Convertimos el contenedor en una lista
          role="list"
          aria-label={`Carrusel de ${title}`}
          className="flex gap-3 md:gap-4 overflow-x-auto pb-4 snap-x snap-mandatory px-1 md:px-4
                   [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((a) => (
            <li
              key={`${a.id.anilist}-${a.id.tmdb ?? "x"}`}
              // A11Y: Cada elemento es un listitem
              role="listitem"
              className="snap-start shrink-0 w-[140px] sm:w-48 md:w-60"
            >
              <AnimeCard
                anime={a}
                showTitleBelow
                onOpen={() => handleOpen(a)}
                variant="default"
              />
            </li>
          ))}
        </ul>
      </motion.section>
    </>
  );
}
