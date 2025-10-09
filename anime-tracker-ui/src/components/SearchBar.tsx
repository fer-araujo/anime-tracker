"use client";
import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Search } from "lucide-react";
import { AnimeCard } from "./AnimeCard";
import { SearchItem, SearchListResponse } from "@/types/anime";
import { AnimeGridSkeleton } from "./Loaders/GridSkeleton";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [res, setRes] = useState<SearchListResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const MIN = 3;

  const doSearch = useCallback(async () => {
    if (query.trim().length < MIN) return;
    setLoading(true);
    try {
      const url = `${
        process.env.NEXT_PUBLIC_API_URL
      }/search?title=${encodeURIComponent(query)}&country=MX&limit=25&enrich=1`; // agrega &enrich=1 si quieres metadatos aquí
      const r = await fetch(url);
      const json = (await r.json()) as SearchListResponse;
      setRes(json);
    } catch (e) {
      console.error(e);
      setRes(null);
    } finally {
      setLoading(false);
    }
  }, [query]);

  function clearSearch() {
    setQuery("");
    setRes(null);
  }

  useEffect(() => {
    const queryTrimmed = query.trim();
    // Si hay menos de MIN caracteres, limpiar resultados y no buscar
    if (queryTrimmed.length < MIN) {
      setRes(null);
      return;
    }
    // Si hay suficiente texto, hacer debounce y buscar
    const t = setTimeout(() => {
      doSearch();
    }, 450);

    // Limpiar timeout al cambiar query o desmontar
    return () => clearTimeout(t);
  }, [query, doSearch]);
  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          doSearch();
        }}
        className="flex items-stretch gap-2"
      >
        <div className="relative flex-1">
          <Input
            placeholder="Busca un anime… (min. 3 letras)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-muted border-neutral-800 pr-10 h-10"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Limpiar búsqueda"
              title="Limpiar búsqueda"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <Button
          type="submit"
          disabled={loading || query.trim().length < MIN}
          className="h-10 px-3 shrink-0"
        >
          {loading ? "…" : <Search size={16} />}
        </Button>
      </form>

      {loading ? (
        <AnimeGridSkeleton count={8} />
      ) : res?.data?.length ? (
        <>
          <h4 className="text-sm text-muted-foreground">
            {res.meta.total} resultado(s) para “{res.meta.query}”
          </h4>
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {res.data.map((item: SearchItem) => (
              <AnimeCard
                key={`${item.ids.tmdb}-${item.title}`}
                anime={{
                  id: { anilist: 0, tmdb: item.ids.tmdb },
                  title: item.title,
                  poster: item.poster,
                  providers: item.providers,
                  meta: item.meta,
                }}
              />
            ))}
          </div>
        </>
      ) : query.trim().length >= MIN && !loading ? (
        <p className="text-sm text-muted-foreground">Sin resultados.</p>
      ) : null}
    </div>
  );
}
