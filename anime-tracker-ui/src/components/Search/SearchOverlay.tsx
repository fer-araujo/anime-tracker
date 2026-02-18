"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useRef } from "react";

type Item = {
  ids: { tmdb?: number | null; anilist?: number | null } & Record<
    string,
    unknown
  >;
  title: string;
  poster?: string | null;
  subtitle?: string | null;
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default function SearchOverlay({
  open,
  loading,
  items,
  onClose,
  onSelect,
  anchorRef,
  showThumbs = true,
  activeIndex,
  setActiveIndex,
  query,
}: {
  open: boolean;
  loading: boolean;
  items: Item[];
  onClose: () => void;
  onSelect: (item: Item) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  showThumbs?: boolean;
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  query: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // click-outside + Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | PointerEvent) => {
      const panel = panelRef.current;
      const anchor = anchorRef.current;
      const t = e.target as Node;
      if (!panel || !anchor) return;
      if (!panel.contains(t) && !anchor.contains(t)) onClose();
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", handler, true);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", handler, true);
      document.removeEventListener("keydown", esc);
    };
  }, [open, onClose, anchorRef]);

  const rx = useMemo(() => {
    const q = query?.trim();
    if (!q) return null;
    return new RegExp(`(${escapeRegExp(q)})`, "ig");
  }, [query]);

  const renderTitle = (t: string) => {
    if (!rx) return t;
    const parts = t.split(rx);
    return parts.map((p, i) =>
      rx.test(p) ? (
        <mark
          key={i}
          className="bg-emerald-500/20 text-emerald-200 rounded px-1"
        >
          {p}
        </mark>
      ) : (
        <span key={i}>{p}</span>
      )
    );
  };

  if (!open) return null;

  return (
    <div className="relative w-full">
      <div
        ref={panelRef}
        className="absolute top-full left-0 mt-2 z-50 w-full overflow-hidden rounded-xl border border-white/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 shadow-2xl"
        role="dialog"
        aria-label="Resultados de búsqueda"
      >
        <div className="px-3 py-2 text-xs text-muted-foreground/90 border-b border-white/10">
          {loading
            ? "Buscando…"
            : items.length
            ? "Resultados"
            : "Sin resultados"}
        </div>

        {loading ? (
          <div className="max-h-[60vh] overflow-auto p-2 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2">
                <div className="h-14 w-10 rounded-md bg-muted/40" />
                <div className="h-3 w-56 rounded bg-muted/40" />
              </div>
            ))}
          </div>
        ) : items.length ? (
          <ul className="max-h-[60vh] overflow-auto py-1">
            {items.map((it, i) => {
              const isActive = i === activeIndex;
              return (
                <li
                  key={`${it.ids.anilist ?? it.ids.tmdb ?? it.title}-${i}`}
                  tabIndex={0}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => onSelect(it)}
                  className={[
                    "group flex items-center gap-4 px-4 py-3 cursor-pointer outline-none",
                    "hover:bg-white/[0.06] focus:bg-white/[0.08]",
                    isActive
                      ? "bg-white/[0.08] ring-1 ring-white/10"
                      : "hover:bg-white/[0.04]",
                  ].join(" ")}
                >
                  {showThumbs ? (
                    <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-xl bg-muted/30 ring-1 ring-white/10">
                      {it.poster ? (
                        <>
                          <Image
                            src={it.poster}
                            alt={it.title}
                            fill
                            sizes="56px"
                            className="object-cover object-center"
                            quality={90}
                            priority={i < 6}
                          />
                          {/* contraste + foco */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                          {/* glow sutil al hover */}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ring-1 ring-emerald-400/20" />
                        </>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-tight">
                      {renderTitle(it.title)}
                    </div>

                    {/* ✅ opcional: deja subtitle solo si aporta algo */}
                    {it.subtitle ? (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {it.subtitle}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-3 py-4 text-sm text-muted-foreground">
            No se encontraron coincidencias
          </div>
        )}
      </div>
    </div>
  );
}
