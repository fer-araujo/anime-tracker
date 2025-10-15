"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";
import SearchOverlay from "@/components/SearchOverlay";

type ResultItem = {
  ids: {
    tmdb?: number | null;
    anilist?: number | null;
    mal?: number | null;
    kitsu?: string | null;
  };
  title: string;
  poster?: string | null;
  subtitle?: string | null;
};

const MIN = 3;
const DEBOUNCE_MS = 450;

export default function SearchBar({
  limit = 12,
  region = "MX",
}: {
  limit?: number;
  region?: string;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ResultItem[]>([]);
  const anchorRef = useRef<HTMLDivElement>(null);

  const doFetch = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const url =
          `${process.env.NEXT_PUBLIC_API_URL}/search` +
          `?title=${encodeURIComponent(q)}&country=${encodeURIComponent(
            region
          )}` +
          `&limit=${encodeURIComponent(
            String(Math.max(5, Math.min(limit, 15)))
          )}` +
          `&onlyAnime=1&enrich=0`;
        const r = await fetch(url);
        const json = await r.json();
        setItems(json?.data ?? []);
        setOpen(true);
      } catch (e) {
        console.error(e);
        setItems([]);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    },
    [limit, region]
  );
  const handleSelect = (item: ResultItem) => {
    console.log("Selected item:", item);
  };
  // Debounce
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN) {
      setItems([]);
      setOpen(false);
      return;
    }
    const t = setTimeout(() => {
      void doFetch(q);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, doFetch]);

  return (
    <div className="relative w-full" ref={anchorRef}>
      <form
        className="relative flex w-full items-stretch gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const q = query.trim();
          if (q.length >= MIN && items[0]) handleSelect(items[0]);
        }}
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca un anime… (min. 3 letras)"
          className="h-10 w-full pr-10"
          onFocus={() => query.trim().length >= MIN && setOpen(true)}
          spellCheck={false}
        />
        <Button
          type="submit"
          size="icon"
          className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
          disabled={query.trim().length < MIN}
          aria-label="Buscar"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </form>

      <SearchOverlay
        open={open}
        loading={loading}
        items={items}
        onClose={() => setOpen(false)}
        onSelect={(it) => {
          setOpen(false);
          handleSelect(it);
        }}
        anchorRef={anchorRef}
        showThumbs
      />
    </div>
  );
}
