"use client";
import { useRef } from "react";
import type { Anime } from "@/types/anime";
import { cn } from "@/lib/utils";
import { AnimeCard } from "./AnimeCard";
import { useRouter } from "next/navigation";

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
    // Aquí podrías usar un router para ir a la página del anime, por ejemplo:
    router.push(`/anime/${anime.id.anilist}`);
  };

  return (
    <>
      {/* <div className="h-8 bg-[linear-gradient(180deg,rgba(0,0,0,0.6)_0%,rgba(0,0,0,0)_100%)]" /> */}
      <section className={cn("relative px-8 md:px-16 py-12", className)}>
        <div
          className="pointer-events-none absolute inset-0 -z-10
                  bg-[conic-gradient(from_180deg_at_50%_50%,rgba(255,255,255,0.02),rgba(0,0,0,0.08),rgba(255,255,255,0.02))]"
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.035]
                  [background-image:radial-gradient(1px_1px_at_20%_30%,#fff,transparent),radial-gradient(1px_1px_at_80%_60%,#fff,transparent)]"
        />

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-semibold text-white/95">
            {title}
          </h2>
          <div className="hidden md:flex gap-2">
            <button
              onClick={() => scroll(-1)}
              className="hidden md:grid absolute inset-y-0 left-0 z-10 w-12 place-items-center hover:bg-white/5 transition-colors"
            >
              <span className="text-white/80 hover:text-white text-2xl -translate-x-1">
                ‹
              </span>
            </button>
            <button
              onClick={() => scroll(1)}
              className="hidden md:grid absolute inset-y-0 right-0 z-10 w-12 place-items-center hover:bg-white/5 transition-colors"
            >
              <span className="text-white/80 hover:text-white text-2xl translate-x-1">
                ›
              </span>
            </button>
          </div>
        </div>

        <div
          ref={ref}
          className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory
                   [scrollbar-width:none] [-ms-overflow-style:none]
                   [&::-webkit-scrollbar]:hidden"
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
      </section>
    </>
  );
}
