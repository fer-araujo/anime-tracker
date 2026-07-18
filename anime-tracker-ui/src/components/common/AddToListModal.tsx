"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import Icon from "@/components/custom/Icon";
import { cn } from "@/lib/utils";
import type { WatchlistEntry, WatchlistStatus } from "@/types/anime";
import {
  addToWatchlist,
  updateStatus,
  toggleFavorite,
  removeFromWatchlist,
} from "@/actions/watchlist";

/* -------------------------------------------------------------------------- */
/*  Status constants                                                           */
/* -------------------------------------------------------------------------- */

const STATUS_LABELS: Record<WatchlistStatus, string> = {
  plan_to_watch: "Plan to Watch",
  watching: "Watching",
  completed: "Completed",
  on_hold: "On Hold",
  dropped: "Dropped",
};

const STATUS_ACTIVE_COLORS: Record<WatchlistStatus, string> = {
  watching: "border-sky-500/40 text-sky-300 bg-sky-500/10",
  completed: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  on_hold: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  dropped: "border-red-500/40 text-red-300 bg-red-500/10",
  plan_to_watch: "border-white/20 text-white/60 bg-white/5",
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

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface AddToListModalProps {
  animeId: number;
  currentEntry: WatchlistEntry | null;
  onClose: () => void;
}

/* -------------------------------------------------------------------------- */
/*  AddToListModal                                                             */
/* -------------------------------------------------------------------------- */

export function AddToListModal({
  animeId,
  currentEntry,
  onClose,
}: AddToListModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<WatchlistStatus | null>(
    currentEntry?.status ?? null,
  );
  const [isFav, setIsFav] = useState(currentEntry?.favorite ?? false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = useCallback(async () => {
    if (isSubmitting) return;

    const statusChanged =
      selectedStatus !== (currentEntry?.status ?? null);
    const favChanged = isFav !== (currentEntry?.favorite ?? false);

    // No changes — close immediately
    if (!statusChanged && !favChanged) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Parallel status + favorite calls
      const promises: Promise<{ success: boolean; error?: string }>[] = [];

      if (statusChanged) {
        if (currentEntry) {
          promises.push(updateStatus(animeId, selectedStatus!));
        } else {
          promises.push(addToWatchlist(animeId, selectedStatus!));
        }
      }

      if (favChanged) {
        promises.push(toggleFavorite(animeId, isFav));
      }

      const results = await Promise.all(promises);
      const failed = results.find((r) => !r.success);

      if (failed) {
        setError("No se pudo guardar. Intenta de nuevo.");
        setIsSubmitting(false);
      } else {
        onClose();
      }
    } catch {
      setError("No se pudo guardar. Intenta de nuevo.");
      setIsSubmitting(false);
    }
  }, [
    animeId,
    currentEntry,
    selectedStatus,
    isFav,
    isSubmitting,
    onClose,
  ]);

  const handleRemove = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await removeFromWatchlist(animeId);
      if (result.success) {
        onClose();
      } else {
        setError("No se pudo eliminar. Intenta de nuevo.");
        setIsSubmitting(false);
      }
    } catch {
      setError("No se pudo eliminar. Intenta de nuevo.");
      setIsSubmitting(false);
    }
  }, [animeId, onClose]);

  const allStatuses: WatchlistStatus[] = [
    "watching",
    "completed",
    "on_hold",
    "dropped",
    "plan_to_watch",
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="px-5 pb-5 pt-2 space-y-5"
    >
      {/* Title */}
      <div className="flex items-center justify-between">
        <h2
          id="watchlist-modal-title"
          className="text-base font-semibold text-white/90"
        >
          Añadir a lista
        </h2>
      </div>

      {/* Status group */}
      <div role="radiogroup" aria-label="Estado de visualización" className="space-y-3">
        <label className="text-[10px] font-medium text-white/30 uppercase tracking-wider block">
          Estado
        </label>
        <div className="grid grid-cols-2 gap-2">
          {allStatuses.slice(0, 4).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={selectedStatus === s}
              onClick={() => setSelectedStatus(s)}
              className={cn(
                "px-3 py-2.5 rounded-lg text-xs font-semibold border transition-all duration-150 cursor-pointer text-left min-h-[44px]",
                s === selectedStatus
                  ? STATUS_ACTIVE_COLORS[s]
                  : STATUS_BUTTON_COLORS[s],
              )}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        {/* Plan to Watch — full width */}
        <button
          type="button"
          role="radio"
          aria-checked={selectedStatus === "plan_to_watch"}
          onClick={() => setSelectedStatus("plan_to_watch")}
          className={cn(
            "w-full px-3 py-2.5 rounded-lg text-xs font-semibold border transition-all duration-150 cursor-pointer text-left min-h-[44px]",
            selectedStatus === "plan_to_watch"
              ? STATUS_ACTIVE_COLORS["plan_to_watch"]
              : STATUS_BUTTON_COLORS["plan_to_watch"],
          )}
        >
          {STATUS_LABELS["plan_to_watch"]}
        </button>
      </div>

      <div className="h-px bg-white/5" />

      {/* Favorite toggle */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">
          Favorito
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={isFav}
          aria-label="Favorito"
          onClick={() => setIsFav(!isFav)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all duration-150 cursor-pointer min-h-[44px]",
            isFav
              ? "border-pink-400/40 bg-pink-500/20 text-pink-300"
              : "border-white/10 text-white/50 hover:text-white hover:bg-white/5",
          )}
        >
          <Icon
            name="Heart"
            size={14}
            className={isFav ? "fill-pink-300 text-pink-300" : ""}
          />
          {isFav ? "Favorito" : "Añadir a favoritos"}
        </button>
      </div>

      <div className="h-px bg-white/5" />

      {/* Custom list placeholder */}
      <div className="opacity-40 pointer-events-none select-none">
        <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider block mb-2">
          Listas personalizadas
        </span>
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-dashed border-white/10">
          <span className="text-xs text-white/40">
            Añadir a lista personalizada
          </span>
          <span className="text-[9px] font-semibold text-white/20 uppercase tracking-wider bg-white/5 px-1.5 py-0.5 rounded">
            Próximamente
          </span>
        </div>
      </div>

      {/* Remove from list */}
      {currentEntry && (
        <button
          type="button"
          disabled={isSubmitting}
          onClick={handleRemove}
          className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon name="Trash2" size={12} />
          Quitar de lista
        </button>
      )}

      {/* Error */}
      {error && (
        <p role="alert" className="text-xs text-red-400 flex items-center gap-1.5">
          <Icon name="AlertCircle" size={12} />
          {error}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-xs font-semibold text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-white text-xs font-semibold hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          {isSubmitting ? (
            <>
              <Icon name="Loader2" size={12} className="animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar"
          )}
        </button>
      </div>
    </motion.div>
  );
}
