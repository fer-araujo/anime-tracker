"use client";

import { useAuth } from "@/providers/AuthProvider";
import Icon from "@/components/custom/Icon";
import { cn } from "@/lib/utils";
import type { AnimeEntry, TrackingStatus } from "@/types/anime";
import {
  STATUS_LABELS,
  STATUS_ICONS,
  STATUS_COLORS,
} from "@/constants/tracking";

type Props = {
  entry: AnimeEntry | null;
  loading: boolean;
  onAddToList: (
    status: TrackingStatus,
  ) => Promise<{ success: boolean; error?: string }>;
  onUpdateStatus: (
    status: TrackingStatus,
  ) => Promise<{ success: boolean; error?: string }>;
  onToggleFavorite: (
    next: boolean,
  ) => Promise<{ success: boolean; error?: string }>;
  onSetScore: (
    score: number | null,
  ) => Promise<{ success: boolean; error?: string }>;
  onRemove: () => Promise<{ success: boolean; error?: string }>;
};

export default function AnimeTrackingSection({
  entry,
  loading,
  onAddToList,
  onUpdateStatus,
  onToggleFavorite,
  onSetScore,
  onRemove,
}: Props) {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="w-full p-4 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
            <Icon name="Lock" size={16} className="text-white/40" />
          </div>
          <p className="text-sm text-white/60">
            <a
              href="/login"
              className="text-primary font-semibold hover:text-primary/80 transition-colors"
            >
              Inicia sesión
            </a>{" "}
            para llevar el progreso de este anime.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full p-6 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-md flex items-center justify-center gap-3">
        <Icon name="Loader2" size={20} className="animate-spin text-primary" />
        <span className="text-xs font-bold text-white/40 uppercase tracking-widest">
          Sincronizando progreso...
        </span>
      </div>
    );
  }

  const currentStatus = entry?.status ?? null;
  const isFavorite = entry?.favorite ?? false;
  const currentScore = entry?.score ?? null;

  return (
    <div className="w-full p-5 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-md flex flex-col gap-5">
      {/* ===== FILA 1: ESTADOS Y ACCIONES ===== */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        {/* Lado Izquierdo: Estados */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mr-2">
            Progreso
          </span>
          {(Object.keys(STATUS_LABELS) as TrackingStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                if (currentStatus === s) return;
                currentStatus ? onUpdateStatus(s) : onAddToList(s);
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold border transition-all duration-200 cursor-pointer",
                s === currentStatus
                  ? STATUS_COLORS[s].active
                  : STATUS_COLORS[s].hover,
              )}
            >
              <Icon name={STATUS_ICONS[s]} size={14} />
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Lado Derecho: Favorito y Eliminar */}
        <div className="flex items-center gap-3 xl:border-l xl:border-white/5 xl:pl-5">
          <button
            type="button"
            onClick={() => onToggleFavorite(!isFavorite)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all duration-200 cursor-pointer",
              isFavorite
                ? "border-pink-500/50 bg-pink-500/10 text-pink-300 shadow-[0_0_15px_rgba(236,72,153,0.1)]"
                : "border-white/10 text-white/50 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon
              name="Heart"
              size={14}
              className={cn(
                "transition-transform",
                isFavorite && "fill-pink-400 scale-110",
              )}
            />
            {isFavorite ? "Favorito" : "Añadir a Favoritos"}
          </button>

          {entry && (
            <button
              type="button"
              onClick={() => onRemove()}
              className="flex items-center justify-center w-9 h-9 rounded-lg border border-red-500/10 text-red-400/80 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-colors cursor-pointer group"
              title="Eliminar de mi lista"
            >
              <Icon
                name="Trash2"
                size={14}
                className="group-hover:scale-110 transition-transform"
              />
            </button>
          )}
        </div>
      </div>

      {/* ===== FILA 2: PUNTUACIÓN ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-4 border-t border-white/5">
        <div className="flex items-center justify-between sm:w-auto">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mr-4">
            Calificación
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onSetScore(currentScore === n ? null : n)}
              className={cn(
                "min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-[11px] font-bold border transition-all duration-200",
                currentScore === n
                  ? "bg-primary text-white border-primary shadow-[0_0_10px_rgba(var(--primary),0.5)] z-10 scale-110"
                  : "border-white/10 text-white/50 hover:border-primary/50 hover:text-white hover:bg-primary/10 cursor-pointer",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
