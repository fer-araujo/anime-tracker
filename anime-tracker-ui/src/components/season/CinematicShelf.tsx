"use client";

import { useRef, useId } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BackdropCard } from "./BackdropCard";
import type { Anime } from "@/types/anime";

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

type CinematicShelfProps = {
  title: string;
  items: Anime[];
  onCardOpen: (anime: Anime) => void;
};

/* -------------------------------------------------------------------------- */
/*  CinematicShelf                                                             */
/* -------------------------------------------------------------------------- */

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

export function CinematicShelf({ title, items, onCardOpen }: CinematicShelfProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.75;
    el.scrollBy({ left: dir * scrollAmount, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <section aria-labelledby={titleId} className="mb-8">
      {/* Title with accent underline */}
      <div className="flex items-center gap-3 mb-4">
        <h2
          id={titleId}
          className="text-xl md:text-2xl font-semibold text-white/95"
        >
          {title}
        </h2>
        <span className="h-0.5 flex-1 bg-gradient-to-r from-primary/60 to-transparent rounded-full" />
      </div>

      {/* Scrollable shelf */}
      <div className="relative group/shelf">
        {/* Left arrow — hidden on mobile */}
        <button
          aria-label="Desplazar a la izquierda"
          onClick={() => scroll(-1)}
          className="hidden md:grid absolute -left-4 top-0 bottom-0 z-10 w-10 place-items-center opacity-0 group-hover/shelf:opacity-100 transition-opacity duration-200 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
        >
          <span
            aria-hidden="true"
            className="text-white/60 hover:text-white text-3xl cursor-pointer"
          >
            ‹
          </span>
        </button>

        <motion.div
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: false, margin: "-50px" }}
          className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth
                     [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          role="list"
          aria-label={`Carrusel de ${title}`}
        >
          {items.map((anime) => (
            <motion.div
              key={anime.id.anilist}
              variants={cardVariants}
              role="listitem"
              className="snap-start shrink-0 w-[280px] sm:w-[340px] motion-reduce:opacity-100 motion-reduce:translate-y-0"
            >
              <BackdropCard anime={anime} onOpen={onCardOpen} />
            </motion.div>
          ))}
        </motion.div>

        {/* Right arrow — hidden on mobile */}
        <button
          aria-label="Desplazar a la derecha"
          onClick={() => scroll(1)}
          className="hidden md:grid absolute -right-4 top-0 bottom-0 z-10 w-10 place-items-center opacity-0 group-hover/shelf:opacity-100 transition-opacity duration-200 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
        >
          <span
            aria-hidden="true"
            className="text-white/60 hover:text-white text-3xl cursor-pointer"
          >
            ›
          </span>
        </button>
      </div>
    </section>
  );
}
