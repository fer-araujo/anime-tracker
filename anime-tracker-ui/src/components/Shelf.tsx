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
    const card = 240; // aprox width + gap (tu w-60 ≈ 240px)
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
          "relative py-12",
          "pl-[min(18vw,6rem)] pr-[min(18vw,6rem)] md:pl-8 md:pr-8",
          className,
        )}
      >
        {/* --- FLECHAS ALINEADAS CON EL HERO --- */}
        {/* Al estar directo en el <section>, su absolute inset-y-0 abarca todo el alto del shelf */}
        <button
          onClick={() => scroll(-1)}
          className="hidden md:grid absolute inset-y-0 -left-16 z-10 w-[18vw] max-w-24 place-items-center  transition-colors"
        >
          <span className="text-white/60 hover:text-white text-4xl cursor-pointer -translate-x-1">
            ‹
          </span>
        </button>
        <button
          onClick={() => scroll(1)}
          className="hidden md:grid absolute inset-y-0 -right-16 z-10 w-[18vw] max-w-24 place-items-center  transition-colors"
        >
          <span className="text-white/60 hover:text-white text-4xl cursor-pointer translate-x-1">
            ›
          </span>
        </button>

        {/* --- TÍTULO --- */}
        <div className="mb-4">
          <h2 className="text-xl md:text-2xl font-semibold text-white/95">
            {title}
          </h2>
        </div>

        {/* --- CARDS --- */}
        <div
          ref={ref}
          className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory px-3 sm:px-4
                   [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((a) => (
            <div
              key={`${a.id.anilist}-${a.id.tmdb ?? "x"}`}
              className="snap-start shrink-0 w-60"
            >
              <AnimeCard
                anime={a}
                showTitleBelow
                onOpen={() => handleOpen(a)}
              />
            </div>
          ))}
        </div>
      </motion.section>
    </>
  );
}
