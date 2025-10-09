"use client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AnimeCard } from "./AnimeCard";

type SearchResult = {
  meta: { country: string; query: string; source: string };
  data: null | {
    ids: { tmdb: number | null; mal?: number | null; kitsu?: string | null };
    title: string;
    poster: string | null;
    providers: string[];
    meta?: { genres?: string[]; rating?: number | null; synopsis?: string | null };
  };
};

export function SearchBar() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function doSearch() {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/search?title=${encodeURIComponent(q)}&country=MX`);
      const json = (await r.json()) as SearchResult;
      setRes(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => { if (q.trim().length >= 3) doSearch(); }, 450);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Busca un anime…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="bg-muted border-neutral-800"
        />
        <Button onClick={doSearch} disabled={loading}>
          {loading ? "Buscando…" : "Buscar"}
        </Button>
      </div>

      {res?.data ? (
        <div>
          <h4 className="text-sm text-muted-foreground mb-2">
            Resultado para “{res.meta.query}”
          </h4>
          <AnimeCard
            anime={{
              id: { anilist: 0, tmdb: res.data.ids.tmdb },
              title: res.data.title,
              poster: res.data.poster,
              providers: res.data.providers,
            }}
          />
        </div>
      ) : res && !res.data && !loading ? (
        <p className="text-sm text-muted-foreground">Sin resultados.</p>
      ) : null}
    </div>
  );
}
