"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/custom/Icon";
import { cn } from "@/lib/utils";
import type { AnimeEntry, TrackingStatus } from "@/types/anime";
import {
  addToTracking,
  updateStatus,
  toggleFavorite,
  removeFromTracking,
  setScore,
} from "@/actions/tracking";
import { addToList, removeFromList } from "@/actions/lists";
import { useUserLists } from "@/hooks/useUserLists";
import { CreateListDialog } from "@/components/lists/CreateListDialog";
import {
  STATUS_LABELS,
  STATUS_ICONS,
  STATUS_COLORS,
} from "@/constants/tracking";

interface AddToListModalProps {
  animeId: number;
  currentEntry: AnimeEntry | null;
  onClose: () => void;
}

export function AddToListModal({
  animeId,
  currentEntry,
  onClose,
}: AddToListModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<TrackingStatus | null>(
    currentEntry?.status ?? null,
  );
  const [isFav, setIsFav] = useState(currentEntry?.favorite ?? false);
  const [score, setScoreState] = useState<number | null>(
    currentEntry?.score ?? null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateList, setShowCreateList] = useState(false);

  const { lists, refetch: refetchLists } = useUserLists();
  const [selectedLists, setSelectedLists] = useState<Set<string>>(new Set());
  const [togglingLists, setTogglingLists] = useState<Set<string>>(new Set());

  const handleConfirm = useCallback(async () => {
    if (isSubmitting) return;

    const statusChanged = selectedStatus !== (currentEntry?.status ?? null);
    const favChanged = isFav !== (currentEntry?.favorite ?? false);
    const scoreChanged = score !== (currentEntry?.score ?? null);

    if (!statusChanged && !favChanged && !scoreChanged) {
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

      if (scoreChanged) {
        promises.push(setScore(animeId, score));
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
  }, [animeId, currentEntry, selectedStatus, isFav, score, isSubmitting, onClose]);

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

  // 🪄 EL SCROLL MÁGICO EXTRAÍDO DIRECTAMENTE DE TU CÓDIGO
  const magicScroll =
    "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20";

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <motion.div
      initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 15, scale: 0.98 }}
      animate={prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 15, scale: 0.98 }}
      transition={
        prefersReduced
          ? { duration: 0.15 }
          : { type: "spring", stiffness: 300, damping: 25 }
      }
      className="flex flex-col bg-background border border-white/10 rounded-2xl shadow-2xl overflow-hidden w-full max-w-md mx-auto"
    >
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary shadow-[0_0_15px_rgba(var(--primary),0.2)]">
            <Icon name="Plus" size={16} />
          </div>
          <div>
            <h2
              id="tracking-modal-title"
              className="text-base font-bold text-white tracking-tight leading-none"
            >
              Añadir a mi lista
            </h2>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
        >
          <Icon name="X" size={16} />
        </button>
      </div>

      {/* ===== SCROLLABLE CONTENT (CON SCROLL MÁGICO) ===== */}
      <div
        className={cn(
          "p-5 space-y-6 overflow-y-auto max-h-[60vh] pr-4",
          magicScroll,
        )}
      >
        {/* --- 1. STATUS SELECTION --- */}
        <div
          role="radiogroup"
          aria-label="Estado de visualización"
          className="space-y-3"
        >
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">
            Estado Principal
          </label>

          <button
            type="button"
            role="radio"
            aria-checked={selectedStatus === "plan_to_watch"}
            onClick={() => setSelectedStatus("plan_to_watch")}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold border transition-all duration-300 cursor-pointer",
              selectedStatus === "plan_to_watch"
                ? STATUS_COLORS["plan_to_watch"].active
                : STATUS_COLORS["plan_to_watch"].hover,
            )}
          >
                <Icon name={STATUS_ICONS["plan_to_watch"]} size={16} />
            {STATUS_LABELS["plan_to_watch"]}
          </button>

          <div className="grid grid-cols-2 gap-2">
            {topStatuses.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={selectedStatus === s}
                onClick={() => setSelectedStatus(s)}
                  className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-300 cursor-pointer",
                  s === selectedStatus
                    ? STATUS_COLORS[s].active
                    : STATUS_COLORS[s].hover,
                )}
              >
                <Icon name={STATUS_ICONS[s]} size={14} />
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-white/5 w-full" />

        {/* --- 2. FAVORITE TOGGLE CARD --- */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">
            Colección Rápida
          </label>

          <button
            type="button"
            role="switch"
            aria-checked={isFav}
            onClick={() => setIsFav(!isFav)}
            className={cn(
              "flex items-center justify-between w-full p-3.5 rounded-xl border transition-all duration-300 cursor-pointer group",
              isFav
                ? "border-pink-500/50 bg-pink-500/10 shadow-[0_0_20px_rgba(236,72,153,0.1)]"
                : "border-white/10 bg-white/5 hover:bg-white/10",
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full transition-colors",
                  isFav
                    ? "bg-pink-500/20"
                    : "bg-white/10 group-hover:bg-white/20",
                )}
              >
                <Icon
                  name="Heart"
                  size={14}
                  className={cn(
                    "transition-all duration-300",
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
                  Mis Favoritos
                </p>
              </div>
            </div>

            <div
              className={cn(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-300",
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
                    <Icon name="Check" size={10} className="text-white" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </button>
        </div>

        {/* --- 3. SCORE SELECTOR --- */}
        <div className="space-y-3">
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">
            Calificación
          </label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setScoreState(score === n ? null : n)}
                className={cn(
                  "min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-[11px] font-bold border transition-all duration-200",
                  score === n
                    ? "bg-primary text-white border-primary shadow-[0_0_10px_rgba(var(--primary),0.5)] z-10 scale-110"
                    : "border-white/10 text-white/50 hover:border-primary/50 hover:text-white hover:bg-primary/10 cursor-pointer",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          {score != null && (
            <p className="text-[10px] text-white/30 font-medium ml-1">
              Puntuación: {score}/10
            </p>
          )}
        </div>

        <div className="h-px bg-white/5 w-full" />

        {/* --- 4. CUSTOM COLLECTIONS --- */}
        <div className="space-y-3">
          <div className="flex items-center justify-between ml-1">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
              Mis listas
            </label>
            <button
              type="button"
              onClick={() => setShowCreateList(true)}
              className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Icon name="Plus" size={12} />
              Nueva
            </button>
          </div>

          {lists.length > 0 ? (
            // AQUI TAMBIÉN INYECTAMOS EL SCROLL MÁGICO
            <div
              className={cn(
                "grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-2",
                magicScroll,
              )}
            >
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
                      "flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl border transition-all duration-200 cursor-pointer text-left group",
                      isSelected
                        ? "border-primary/40 bg-primary/10"
                        : "border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10",
                    )}
                  >
                    <span
                      className={cn(
                        "text-xs font-medium truncate transition-colors",
                        isSelected
                          ? "text-primary"
                          : "text-white/70 group-hover:text-white",
                      )}
                    >
                      {list.name}
                    </span>
                    {isToggling ? (
                      <Icon
                        name="Loader2"
                        size={14}
                        className="animate-spin text-white/40"
                      />
                    ) : isSelected ? (
                      <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Icon name="Check" size={10} className="text-white" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-white/20 group-hover:border-white/40 transition-colors" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-5 rounded-xl border border-dashed border-white/10 bg-white/[0.01] select-none text-center">
              <p className="text-xs font-medium text-white/40">
                Sin colecciones creadas
              </p>
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
      </div>

      {/* ===== FOOTER ===== */}
      <div className="flex items-center justify-between p-5 border-t border-white/5 bg-white/[0.02]">
        <div>
          {currentEntry && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleRemove}
              className="flex items-center gap-1.5 text-[11px] font-bold text-white/30 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Icon name="Trash2" size={14} />
              <span className="hidden sm:inline uppercase tracking-wider">
                Eliminar registro
              </span>
              <span className="sm:hidden uppercase tracking-wider">
                Eliminar
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={
              isSubmitting || (!selectedStatus && !isFav && score === (currentEntry?.score ?? null) && !currentEntry)
            }
            className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-[0_4px_15px_rgba(var(--primary),0.2)] hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Icon name="Loader2" size={14} className="animate-spin" />
                Guardando...
              </>
            ) : currentEntry ? (
              "Guardar Cambios"
            ) : (
              "Añadir a mi lista"
            )}
          </button>
        </div>
      </div>

      <CreateListDialog
        isOpen={showCreateList}
        onClose={() => setShowCreateList(false)}
        onCreated={() => refetchLists()}
      />
    </motion.div>
  );
}
