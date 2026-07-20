"use client";

import { useAuth } from "@/providers/AuthProvider";
import Icon from "@/components/custom/Icon";
import { cn } from "@/lib/utils";
import type { WatchlistEntry, WatchlistStatus } from "@/types/anime";

const STATUS_LABELS: Record<WatchlistStatus, string> = {
  plan_to_watch: "Plan to Watch",
  watching: "Watching",
  completed: "Completed",
  on_hold: "On Hold",
  dropped: "Dropped",
};

const STATUS_ACTIVE_COLORS: Record<WatchlistStatus, string> = {
  plan_to_watch: "border-white/20 text-white/60 bg-white/5",
  watching: "border-sky-500/40 text-sky-300 bg-sky-500/10",
  completed: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  on_hold: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  dropped: "border-red-500/40 text-red-300 bg-red-500/10",
};

const STATUS_BUTTON_COLORS: Record<WatchlistStatus, string> = {
  plan_to_watch:
    "border-white/10 text-white/60 hover:text-white hover:bg-white/5",
  watching:
    "border-sky-500/30 text-sky-400 hover:bg-sky-500/10 hover:border-sky-500/50",
  completed:
    "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50",
  on_hold:
    "border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50",
  dropped:
    "border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50",
};

type Props = {
  entry: WatchlistEntry | null;
  loading: boolean;
  onAddToList: (status: WatchlistStatus) => Promise<{ success: boolean; error?: string }>;
  onUpdateStatus: (status: WatchlistStatus) => Promise<{ success: boolean; error?: string }>;
  onToggleFavorite: (next: boolean) => Promise<{ success: boolean; error?: string }>;
  onSetScore: (score: number | null) => Promise<{ success: boolean; error?: string }>;
  onRemove: () => Promise<{ success: boolean; error?: string }>;
};

export default function AnimeWatchlistSection({
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
      <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-md text-center">
        <p className="text-xs text-white/40">
          <a href="/login" className="text-primary hover:underline">
            Inicia sesión
          </a>{" "}
          para añadir a tu lista
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-md text-center">
        <Icon
          name="Loader2"
          size={16}
          className="animate-spin text-primary mx-auto"
        />
      </div>
    );
  }

  const currentStatus = entry?.status ?? null;
  const isFavorite = entry?.favorite ?? false;
  const currentScore = entry?.score ?? null;

  return (
    <div className="p-5 rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-md space-y-4">
      <span className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] block">
        Mi Lista
      </span>

      {/* Status selector */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-white/30 uppercase tracking-wider">
          Estado
        </label>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(STATUS_LABELS) as WatchlistStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                if (currentStatus === s) return;
                if (currentStatus) {
                  onUpdateStatus(s);
                } else {
                  onAddToList(s);
                }
              }}
              className={cn(
                "px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider border transition-all duration-150 cursor-pointer",
                s === currentStatus
                  ? STATUS_ACTIVE_COLORS[s]
                  : STATUS_BUTTON_COLORS[s],
              )}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Remove button */}
      {entry && (
        <button
          type="button"
          onClick={() => onRemove()}
          className="flex items-center gap-1.5 text-[10px] font-semibold text-red-400 hover:text-red-300 uppercase tracking-wider transition-colors cursor-pointer"
        >
          <Icon name="Trash2" size={12} />
          Quitar de lista
        </button>
      )}

      <div className="h-px bg-white/5" />

      {/* Favorite toggle */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">
          Favorito
        </span>
        <button
          type="button"
          onClick={() => onToggleFavorite(!isFavorite)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-150 cursor-pointer",
            isFavorite
              ? "border-pink-400/40 bg-pink-500/20 text-pink-300"
              : "border-white/10 text-white/50 hover:text-white hover:bg-white/5",
          )}
        >
          <Icon
            name="Heart"
            size={14}
            className={isFavorite ? "fill-pink-300" : ""}
          />
          {isFavorite ? "Favorito" : "Añadir a favoritos"}
        </button>
      </div>

      {/* Score selector — only for completed */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-white/30 uppercase tracking-wider">
          Puntuación
        </label>
        <div className="flex flex-wrap gap-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              type="button"
              disabled={currentStatus !== "completed" && currentStatus !== null}
              onClick={() => {
                onSetScore(currentScore === n ? null : n);
              }}
              className={cn(
                "w-7 h-7 rounded-md text-[10px] font-bold border transition-all duration-150 cursor-pointer",
                currentScore === n
                  ? "bg-primary/20 text-primary border-primary/30"
                  : currentStatus === "completed" || currentStatus === null
                    ? "border-white/10 text-white/50 hover:text-white hover:bg-white/5"
                    : "border-white/5 text-white/20 cursor-not-allowed",
              )}
            >
              {n}
            </button>
          ))}
        </div>
        {(currentStatus === "completed" || currentStatus === null) && (
          <p className="text-[9px] text-white/30">
            {currentStatus === "completed"
              ? "Puntúa del 1 al 10"
              : "Puntúa después de marcar como completado"}
          </p>
        )}
      </div>
    </div>
  );
}
