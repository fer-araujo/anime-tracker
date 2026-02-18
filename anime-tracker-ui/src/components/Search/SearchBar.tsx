"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

  // ✅ normaliza espacios (sin perder el contenido)
  const q = useMemo(
    () => query.toLowerCase().replace(/\s+/g, " ").trim(),
    [query]
  );

  // ✅ valida por "caracteres útiles":
  // - 1 palabra => >= 3 chars (sin espacios)
  // - 2+ palabras => OK aunque sean cortas (ej: "demon sl")
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
      console.log("Selected item:", item);
      // if (id) router.push(`/anime/${id}`);
      // else console.log("Selected item:", item);
    },
    []
  );

  const doFetch = useCallback(
    async (queryNorm: string) => {
      if (!queryNorm) return;

      // evita refetch del mismo query
      if (queryNorm === lastQRef.current) return;
      lastQRef.current = queryNorm;

      // cancela request anterior
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
    [limit, region]
  );

  // Debounce + gating
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

  // teclado (↑↓ Enter)
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
        className="relative flex w-full items-stretch gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (items[activeIndex]) handleSelect(items[activeIndex]);
          else if (isValid) void doFetch(q);
        }}
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Busca un anime…"
          className="h-10 w-full pr-10"
          onFocus={() => isValid && setOpen(true)}
          spellCheck={false}
        />

        <Button
          type="submit"
          size="icon"
          className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
          disabled={!isValid}
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
