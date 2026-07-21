"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon, { type IconName } from "@/components/custom/Icon";
import { cn } from "@/lib/utils";
import type { AnimeEntry, TrackingStatus } from "@/types/anime";
import {
  addToTracking,
  updateStatus,
  toggleFavorite,
  removeFromTracking,
} from "@/actions/tracking";
import { addToList, removeFromList } from "@/actions/lists";
import { useUserLists } from "@/hooks/useUserLists";

/* -------------------------------------------------------------------------- */
/* Constants & Config                                                        */
/* -------------------------------------------------------------------------- */

const STATUS_CONFIG: Record<
  TrackingStatus,
  { label: string; icon: IconName }
> = {
  watching: { label: "Viendo", icon: "Play" },
  completed: { label: "Completado", icon: "Check" },
  on_hold: { label: "En Pausa", icon: "Clock" },
  dropped: { label: "Abandonado", icon: "X" },
  plan_to_watch: { label: "Plan para ver", icon: "List" },
};

const STATUS_ACTIVE_COLORS: Record<TrackingStatus, string> = {
  watching:
    "border-sky-500/50 text-sky-300 bg-sky-500/10 shadow-[0_0_15px_rgba(14,165,233,0.15)]",
  completed:
    "border-emerald-500/50 text-emerald-300 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]",
  on_hold:
    "border-amber-500/50 text-amber-300 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.15)]",
  dropped:
    "border-red-500/50 text-red-300 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.15)]",
  plan_to_watch:
    "border-white/30 text-white bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]",
};

const STATUS_BUTTON_COLORS: Record<TrackingStatus, string> = {
  watching:
    "border-white/10 text-white/50 hover:border-sky-500/30 hover:text-sky-400 hover:bg-sky-500/5",
  completed:
    "border-white/10 text-white/50 hover:border-emerald-500/30 hover:text-emerald-400 hover:bg-emerald-500/5",
  on_hold:
    "border-white/10 text-white/50 hover:border-amber-500/30 hover:text-amber-400 hover:bg-amber-500/5",
  dropped:
    "border-white/10 text-white/50 hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/5",
  plan_to_watch:
    "border-white/10 text-white/50 hover:border-white/30 hover:text-white hover:bg-white/5",
};

/* -------------------------------------------------------------------------- */
/* Types                                                                     */
/* -------------------------------------------------------------------------- */

interface AddToListModalProps {
  animeId: number;
  currentEntry: AnimeEntry | null;
  onClose: () => void;
}

/* -------------------------------------------------------------------------- */
/* AddToListModal                                                            */
/* -------------------------------------------------------------------------- */

export function AddToListModal({
  animeId,
  currentEntry,
  onClose,
}: AddToListModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<TrackingStatus | null>(
    currentEntry?.status ?? null,
  );
  const [isFav, setIsFav] = useState(currentEntry?.favorite ?? false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Collections integration
  const { lists, refetch: refetchLists } = useUserLists();
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set());
  const [togglingLists, setTogglingLists] = useState<Set<string>>(new Set());

  const handleConfirm = useCallback(async () => {
    if (isSubmitting) return;

    const statusChanged = selectedStatus !== (currentEntry?.status ?? null);
    const favChanged = isFav !== (currentEntry?.favorite ?? false);

    // No changes — close immediately
    if (!statusChanged && !favChanged) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const promises: Promise<{ success: boolean; error?: string }>[] = [];

      if (statusChanged && selectedStatus) {
        if (currentEntry) {
          promises.push(updateStatus(animeId, selectedStatus));
        } else {
          promises.push(addToTracking(animeId, selectedStatus));
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
  }, [animeId, currentEntry, selectedStatus, isFav, isSubmitting, onClose]);

  const handleRemove = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await removeFromTracking(animeId);
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

  const topStatuses: TrackingStatus[] = [
    "watching",
    "completed",
    "on_hold",
    "dropped",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="p-6 space-y-6"
    >
      {/* ===== HEADER ===== */}
      <div className="flex items-center gap-3 pb-2 border-b border-white/5">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary">
          <Icon name="Plus" size={16} />
        </div>
        <h2
          id="tracking-modal-title"
          className="text-lg font-bold text-white tracking-tight"
        >
          Añadir a mi lista
        </h2>
      </div>

      {/* ===== STATUS SELECTION ===== */}
      <div
        role="radiogroup"
        aria-label="Estado de visualización"
        className="space-y-3"
      >
        <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider block ml-1">
          Estado actual
        </label>

        {/* Plan to Watch (Destacado) */}
        <button
          type="button"
          role="radio"
          aria-checked={selectedStatus === "plan_to_watch"}
          onClick={() => setSelectedStatus("plan_to_watch")}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold border transition-all duration-200 cursor-pointer",
            selectedStatus === "plan_to_watch"
              ? STATUS_ACTIVE_COLORS["plan_to_watch"]
              : STATUS_BUTTON_COLORS["plan_to_watch"],
          )}
        >
          <Icon name={STATUS_CONFIG["plan_to_watch"].icon} size={18} />
          {STATUS_CONFIG["plan_to_watch"].label}
        </button>

        {/* Grid de 4 estados secundarios */}
        <div className="grid grid-cols-2 gap-2.5">
          {topStatuses.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={selectedStatus === s}
              onClick={() => setSelectedStatus(s)}
              className={cn(
                "flex items-center gap-2 px-3 py-3 rounded-xl text-xs font-semibold border transition-all duration-200 cursor-pointer",
                s === selectedStatus
                  ? STATUS_ACTIVE_COLORS[s]
                  : STATUS_BUTTON_COLORS[s],
              )}
            >
              <Icon name={STATUS_CONFIG[s].icon} size={16} />
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== FAVORITE TOGGLE CARD ===== */}
      <div className="space-y-3">
        <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider block ml-1">
          Colección
        </label>

        <button
          type="button"
          role="switch"
          aria-checked={isFav}
          onClick={() => setIsFav(!isFav)}
          className={cn(
            "flex items-center justify-between w-full p-4 rounded-xl border transition-all duration-200 cursor-pointer group",
            isFav
              ? "border-pink-500/50 bg-pink-500/10 shadow-[0_0_20px_rgba(236,72,153,0.1)]"
              : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20",
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full transition-colors",
                isFav
                  ? "bg-pink-500/20"
                  : "bg-white/10 group-hover:bg-white/20",
              )}
            >
              <Icon
                name="Heart"
                size={18}
                className={cn(
                  "transition-all",
                  isFav
                    ? "fill-pink-400 text-pink-400 scale-110"
                    : "text-white/50",
                )}
              />
            </div>
            <div className="text-left">
              <p
                className={cn(
                  "text-sm font-semibold transition-colors",
                  isFav ? "text-pink-300" : "text-white/80",
                )}
              >
                Favoritos
              </p>
              <p className="text-[11px] font-medium text-white/40">
                Añade esta serie a tus preferidas
              </p>
            </div>
          </div>

          {/* iOS Style Switch/Check indicator */}
          <div
            className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
              isFav ? "border-pink-500 bg-pink-500" : "border-white/20",
            )}
          >
            <AnimatePresence>
              {isFav && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Icon name="Check" size={12} className="text-white" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </button>

        {/* Collections — real list toggles */}
        {lists.length > 0 && (
          <div className="space-y-2">
            {lists.map((list) => {
              const isSelected = selectedLists.has(list.id);
              const isToggling = togglingLists.has(list.id);
              return (
                <button
                  key={list.id}
                  type="button"
                  disabled={isToggling}
                  onClick={async () => {
                    setTogglingLists((prev) => new Set(prev).add(list.id));
                    if (isSelected) {
                      await removeFromList(list.id, animeId);
                      setSelectedLists((prev) => {
                        const next = new Set(prev);
                        next.delete(list.id);
                        return next;
                      });
                    } else {
                      await addToList(list.id, animeId);
                      setSelectedLists((prev) => new Set(prev).add(list.id));
                    }
                    setTogglingLists((prev) => {
                      const next = new Set(prev);
                      next.delete(list.id);
                      return next;
                    });
                    refetchLists();
                  }}
                  className={cn(
                    "flex items-center justify-between w-full p-3 rounded-xl border transition-all duration-200 cursor-pointer text-left",
                    isSelected
                      ? "border-primary/40 bg-primary/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20",
                  )}
                >
                  <span className="text-xs font-medium text-white/80 truncate">
                    {list.name}
                  </span>
                  {isToggling ? (
                    <Icon name="Loader2" size={14} className="animate-spin text-white/40" />
                  ) : isSelected ? (
                    <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Icon name="Check" size={10} className="text-white" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-white/20" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Fallback when no lists */}
        {lists.length === 0 && (
          <div className="flex items-center justify-between p-4 rounded-xl border border-dashed border-white/10 bg-white/[0.02] opacity-60 select-none">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5">
                <Icon name="Plus" size={18} className="text-white/30" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white/50">Nueva Lista</p>
                <p className="text-[11px] font-medium text-white/30">
                  Crea una colección desde Mis listas
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== ERROR MESSAGE ===== */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            role="alert"
            className="text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-center gap-2"
          >
            <Icon name="AlertCircle" size={14} />
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* ===== FOOTER ACTIONS ===== */}
      <div className="flex items-center justify-between pt-4 mt-2 border-t border-white/5">
        {/* Lado Izquierdo: Acción Destructiva */}
        <div>
          {currentEntry && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleRemove}
              className="flex items-center gap-1.5 text-xs font-bold text-white/40 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Icon name="Trash2" size={14} />
              <span className="hidden sm:inline">Eliminar de lista</span>
              <span className="sm:hidden">Eliminar</span>
            </button>
          )}
        </div>

        {/* Lado Derecho: Acciones Principales */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={
              isSubmitting || (!selectedStatus && !isFav && !currentEntry)
            }
            className="px-6 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-[0_4px_14px_rgba(var(--primary),0.4)] hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Icon name="Loader2" size={14} className="animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar Cambios"
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
