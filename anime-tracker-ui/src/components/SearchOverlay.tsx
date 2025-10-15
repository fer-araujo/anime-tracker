"use client";

import Image from "next/image";
import React, { useEffect, useRef } from "react";

type Item = {
  ids: { tmdb?: number | null } & Record<string, unknown>;
  title: string;
  poster?: string | null;
  subtitle?: string | null;
};

export default function SearchOverlay({
  open,
  loading,
  items,
  onClose,
  onSelect,
  anchorRef,
  showThumbs = true,
}: {
  open: boolean;
  loading: boolean;
  items: Item[];
  onClose: () => void;
  onSelect: (item: Item) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  showThumbs?: boolean;
  minWidth?: number;
  maxWidth?: number;
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
                <div className="h-3 w-40 rounded bg-muted/40" />
              </div>
            ))}
          </div>
        ) : items.length ? (
          <ul className="max-h-[60vh] overflow-auto py-1">
            {items.map((it, i) => (
              <li
                key={`${it.ids.anilist ?? it.ids.tmdb ?? it.title}-${i}`}
                tabIndex={0}
                onClick={() => onSelect(it)}
                className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-white/[0.06] focus:bg-white/[0.08] focus:outline-none"
              >
                {showThumbs ? (
                  <div className="relative h-14 w-10 overflow-hidden rounded-md bg-muted/40">
                    {it.poster ? (
                      <Image
                        src={it.poster}
                        alt={it.title}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                ) : null}
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{it.title}</div>
                  {it.subtitle ? (
                    <div className="truncate text-xs text-muted-foreground">
                      {it.subtitle}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
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
