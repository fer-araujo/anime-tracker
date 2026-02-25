"use client";

import Image from "next/image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom"; // LA MAGIA DEL PORTAL
import { cn } from "@/lib/utils";

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

  // Estados para el Portal
  const [mounted, setMounted] = useState(false);
  const [rect, setRect] = useState({ top: 0, left: 0, width: 0 });

  // 1. Evitar errores de hidratación en Next.js (Solo renderizar portal en el cliente)
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. Calcular la posición exacta del input (anchor) en tiempo real
  useEffect(() => {
    if (!open || !anchorRef.current) return;

    const updatePosition = () => {
      const elRect = anchorRef.current!.getBoundingClientRect();
      setRect({
        top: elRect.bottom + 8, // 8px de margen debajo del input
        left: elRect.left,
        width: elRect.width,
      });
    };

    updatePosition(); // Calculo inicial

    // Escuchar si el usuario hace scroll o voltea el celular
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, anchorRef]);

  // Lógica de click outside y ESC
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
        <span key={i} className="text-primary font-bold">
          {p}
        </span>
      ) : (
        <span key={i} className="text-white/70 font-normal">
          {p}
        </span>
      ),
    );
  };

  // Si no está abierto o no ha montado el cliente, no regresamos nada
  if (!open || !mounted) return null;

  // 3. RENDERIZAMOS EN EL PORTAL (document.body)
  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        zIndex: 999999, // Over 9000! Por encima de cualquier Navbar
      }}
      className={cn(
        "overflow-hidden rounded-2xl border border-white/10",
        "bg-neutral-900/95 backdrop-blur-xl shadow-2xl shadow-black/80",
        "animate-in fade-in zoom-in-95 duration-200 slide-in-from-top-2",
      )}
      role="dialog"
      aria-label="Resultados de búsqueda"
    >
      {/* Header del dropdown */}
      <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-white/40 border-b border-white/5 bg-white/5">
        {loading
          ? "Buscando..."
          : items.length
            ? "Mejores Resultados"
            : "Sin resultados"}
      </div>

      {loading ? (
        <div className="max-h-[60vh] overflow-auto p-2 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2 animate-pulse"
            >
              <div className="h-16 w-12 rounded-lg bg-white/10" />
              <div className="space-y-2">
                <div className="h-3 w-40 rounded bg-white/10" />
                <div className="h-2 w-20 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length ? (
        <ul
          className="max-h-[60vh] overflow-y-auto overflow-x-hidden p-2 
            [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]
            [&::-webkit-scrollbar]:w-1.5
            [&::-webkit-scrollbar-track]:bg-transparent
            [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full
            hover:[&::-webkit-scrollbar-thumb]:bg-white/20 transition-all"
        >
          {items.map((it, i) => {
            const isActive = i === activeIndex;
            return (
              <li
                key={`${it.ids.anilist ?? it.ids.tmdb ?? it.title}-${i}`}
                tabIndex={0}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => onSelect(it)}
                className={cn(
                  "group flex items-center gap-4 px-3 py-2 cursor-pointer outline-none rounded-xl transition-all duration-200 mb-1",
                  isActive
                    ? "bg-white/15 shadow-lg shadow-black/20 ring-1 ring-white/10 translate-x-1"
                    : "hover:bg-white/5 hover:translate-x-0.5 text-white/70",
                )}
              >
                {showThumbs && (
                  <div className="relative h-[84px] w-14 shrink-0 overflow-hidden rounded-md bg-white/5 border border-white/5 group-hover:border-white/20 transition-colors">
                    {it.poster ? (
                      <Image
                        src={it.poster}
                        alt={it.title}
                        fill
                        sizes="56px"
                        className="object-cover object-center"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20 text-xs font-medium">
                        Sin img
                      </div>
                    )}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium leading-tight text-white group-hover:text-white transition-colors">
                    {renderTitle(it.title)}
                  </div>

                  {it.subtitle && (
                    <div className="text-xs text-white/40 mt-1 truncate group-hover:text-white/60 transition-colors">
                      {it.subtitle}
                    </div>
                  )}
                </div>

                <div
                  className={cn(
                    "text-primary opacity-0 -translate-x-2 transition-all duration-300",
                    isActive && "opacity-100 translate-x-0",
                  )}
                >
                  ›
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-white/50">
            No encontramos nada con ese nombre.
          </p>
        </div>
      )}
    </div>,
    document.body, // <- El destino del Portal
  );
}
