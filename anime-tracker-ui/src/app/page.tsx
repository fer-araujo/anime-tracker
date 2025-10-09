"use client";

import { useEffect, useState } from "react";
import { AnimeCard } from "@/components/AnimeCard";
import { apiPath, safeJson } from "@/lib/api";
import type { SeasonResponse } from "@/types/anime";
import { SearchBar } from "@/components/SearchBar";
import { AnimeGridSkeleton } from "@/components/Loaders/GridSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const [season, setSeason] = useState<SeasonResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(apiPath("/season?enrich=1"));
        const json = await safeJson(res);
        setSeason(json as SeasonResponse);
      } catch (err) {
        console.error(err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (error) {
    return <main className="p-6 text-red-400">Error: {error}</main>;
  }

  if (loading || !season) {
    return (
      <main className="flex flex-col gap-4 p-6 text-muted-foreground">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
        <AnimeGridSkeleton count={10} />
      </main>
    );
  }

  return (
    <main className="space-y-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Anime de Temporada
        </h2>
        <p className="text-sm text-muted-foreground">
          {season.meta.year} – {season.meta.season} · {season.meta.total}{" "}
          títulos
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-1">
        <SearchBar />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {season.data.map((anime) => (
          <AnimeCard key={anime.id.anilist} anime={anime} />
        ))}
      </div>
    </main>
  );
}
