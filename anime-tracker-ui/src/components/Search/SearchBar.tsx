"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import SearchOverlay from "@/components/Search/SearchOverlay";
import { fetchSearch } from "@/lib/api";
import type { SearchResultItem } from "@/types/search";

const DEBOUNCE_MS = 300;

export default function SearchBar({
  limit = 12,
  region = "MX",
}: {
  limit?: number;
  region?: string;
}) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SearchResultItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const anchorRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastQRef = useRef<string>("");

  const q = useMemo(
    () => query.toLowerCase().replace(/\s+/g, " ").trim(),
    [query],
  );

  const isValid = useMemo(() => {
    if (!q) return false;
    const tokens = q.split(" ").filter(Boolean);
    const effectiveLen = q.replace(/\s/g, "").length;
    return tokens.length >= 2 || effectiveLen >= 3;
  }, [q]);

  const handleSelect = useCallback(
    (item: SearchResultItem) => {
      setOpen(false);
      const id = item.ids?.anilist;
      router.push(`/anime/${id}`);
    },
    [router],
  );

  const doFetch = useCallback(
    async (queryNorm: string) => {
      if (!queryNorm) return;
      if (queryNorm === lastQRef.current) return;
      lastQRef.current = queryNorm;

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setLoading(true);
      try {
        const json = await fetchSearch({
          title: queryNorm,
          country: region,
          limit,
          signal: ac.signal,
        });

        setItems(json.data);
        setActiveIndex(0);
        setOpen(true);
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === "AbortError") {
          // cancelado: no hacemos nada
        } else {
          console.error(e);
          setItems([]);
          setOpen(true);
        }
      } finally {
        setLoading(false);
      }
    },
    [limit, region],
  );

  useEffect(() => {
    if (!isValid) {
      abortRef.current?.abort();
      setItems([]);
      setOpen(false);
      lastQRef.current = "";
      return;
    }

    const t = setTimeout(() => void doFetch(q), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q, isValid, doFetch]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, items.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (items[activeIndex]) {
        e.preventDefault();
        handleSelect(items[activeIndex]);
      }
    }
  };

  return (
    <div className="relative w-full" ref={anchorRef}>
      <form
        className="relative flex w-full items-stretch gap-2 group"
        onSubmit={(e) => {
          e.preventDefault();
          if (items[activeIndex]) handleSelect(items[activeIndex]);
          else if (isValid) void doFetch(q);
        }}
      >
        {/* COMPONENTE NATIVO LIMPIO (Adiós shadcn) */}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Busca un anime…"
          onFocus={() => isValid && setOpen(true)}
          onBlur={() => {
            setTimeout(() => {
              setQuery("");
              setOpen(false);
            }, 200);
          }}
          spellCheck={false}
          className="h-10 w-full pl-4 pr-10 bg-white/10 border border-white/10 text-white placeholder:text-white/50 backdrop-blur-xs transition-all duration-300 focus:bg-black/40 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary shadow-sm rounded-xl"
        />

        {/* BOTÓN NATIVO LIMPIO (Adiós shadcn) */}
        <button
          type="submit"
          disabled={!isValid}
          aria-label="Buscar"
          className="absolute right-1 top-1/2 flex h-8 w-8 items-center justify-center -translate-y-1/2 bg-transparent hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed border-none rounded-full transition-colors cursor-pointer"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </button>
      </form>

      <SearchOverlay
        open={open}
        loading={loading}
        items={items}
        query={q}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
        onClose={() => setOpen(false)}
        onSelect={(it) => handleSelect(it)}
        anchorRef={anchorRef}
        showThumbs
      />
    </div>
  );
}
