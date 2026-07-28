"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/providers/AuthProvider";
import Icon from "@/components/custom/Icon";
import { cn } from "@/lib/utils";
import { useAnimeLists } from "@/hooks/useAnimeLists";
import type { AnimeEntry, TrackingStatus } from "@/types/anime";
import {
  STATUS_LABELS,
  STATUS_ICONS,
  STATUS_COLORS,
} from "@/constants/tracking";

type Props = {
  animeId: number;
  entry: AnimeEntry | null;
  loading: boolean;
  refreshKey?: number;
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
  onOpenLists?: () => void;
};

const allStatuses: TrackingStatus[] = [
  "plan_to_watch",
  "watching",
  "completed",
  "on_hold",
  "dropped",
];

const pickerVariants = {
  open: { opacity: 1, height: "auto", scale: 1 },
  closed: { opacity: 0, height: 0, scale: 0.95 },
};

export default function AnimeTrackingSection({
  animeId,
  entry,
  loading,
  refreshKey,
  onAddToList,
  onUpdateStatus,
  onToggleFavorite,
  onSetScore,
  onRemove,
  onOpenLists,
}: Props) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showScorePicker, setShowScorePicker] = useState(false);
  const [showListExpanded, setShowListExpanded] = useState(false);
  const { lists } = useAnimeLists(animeId, refreshKey);

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

  const handleSelectStatus = (s: TrackingStatus) => {
    setShowStatusPicker(false);
    if (currentStatus === s) return;
    currentStatus ? onUpdateStatus(s) : onAddToList(s);
  };

  const handleSelectScore = (n: number) => {
    setShowScorePicker(false);
    onSetScore(currentScore === n ? null : n);
  };

  const listCount = lists.length;
  const visibleLists = lists.slice(0, 3);
  const overflowCount = listCount > 3 ? listCount - 3 : 0;

  const handleListBadgeClick = () => {
    setShowStatusPicker(false);
    setShowScorePicker(false);
    if (listCount === 0) {
      onOpenLists?.();
    } else {
      setShowListExpanded((v) => !v);
    }
  };

  return (
    <div className="w-full p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
      {/* ===== COMPACT TOOLBAR ===== */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Status pill — clickable */}
        <button
          type="button"
          onClick={() => {
            setShowScorePicker(false);
            setShowStatusPicker((v) => !v);
          }}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold border transition-all duration-200 cursor-pointer",
            currentStatus
              ? STATUS_COLORS[currentStatus].active
              : "border-white/10 text-white/50 hover:border-white/30 hover:text-white hover:bg-white/5",
          )}
        >
          <Icon
            name={currentStatus ? STATUS_ICONS[currentStatus] : "Plus"}
            size={14}
          />
          {currentStatus ? STATUS_LABELS[currentStatus] : "Añadir"}
          <Icon
            name="ChevronDown"
            size={12}
            className={cn(
              "transition-transform duration-200",
              showStatusPicker && "rotate-180",
            )}
          />
        </button>

        {/* Score badge — clickable */}
        <button
          type="button"
          onClick={() => {
            setShowStatusPicker(false);
            setShowScorePicker((v) => !v);
          }}
          className={cn(
            "flex items-center gap-1 px-2.5 py-2 rounded-lg border text-[11px] font-bold transition-all duration-200 cursor-pointer",
            currentScore != null
              ? "border-emerald-500/30 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20"
              : "border-white/10 text-white/40 hover:border-white/30 hover:text-white hover:bg-white/5",
          )}
        >
          <Icon name="Star" size={12} />
          {currentScore != null ? `${currentScore}/10` : "Calificar"}
          <Icon
            name="ChevronDown"
            size={10}
            className={cn(
              "transition-transform duration-200",
              showScorePicker && "rotate-180",
            )}
          />
        </button>

        {/* List badge — clickable */}
        <button
          type="button"
          onClick={handleListBadgeClick}
          className={cn(
            "flex items-center gap-1 px-2.5 py-2 rounded-lg border text-[11px] font-bold transition-all duration-200 cursor-pointer",
            listCount > 0
              ? "border-violet-500/30 text-violet-300 bg-violet-500/10 hover:bg-violet-500/20"
              : "border-white/10 text-white/40 hover:border-white/30 hover:text-white hover:bg-white/5",
          )}
        >
          <Icon name="List" size={12} />
          {listCount > 0 ? `${listCount} ${listCount === 1 ? "lista" : "listas"}` : "0 listas"}
          {listCount > 0 && (
            <Icon
              name="ChevronDown"
              size={10}
              className={cn(
                "transition-transform duration-200",
                showListExpanded && "rotate-180",
              )}
            />
          )}
        </button>

        <div className="h-5 w-px bg-white/5 mx-1" />

        {/* Favorite */}
        <button
          type="button"
          onClick={() => onToggleFavorite(!isFavorite)}
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-lg border transition-all duration-200 cursor-pointer",
            isFavorite
              ? "border-pink-500/50 bg-pink-500/10"
              : "border-white/10 text-white/50 hover:bg-white/10",
          )}
          title={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
        >
          <Icon
            name="Heart"
            size={14}
            className={cn(
              "transition-transform",
              isFavorite && "fill-pink-400 text-pink-400 scale-110",
            )}
          />
        </button>

        {/* Delete */}
        {entry && (
          <button
            type="button"
            onClick={() => onRemove()}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-red-500/10 text-red-400/80 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-colors cursor-pointer"
            title="Eliminar de mi lista"
          >
            <Icon name="Trash2" size={14} />
          </button>
        )}
      </div>

      {/* ===== EXPANDED STATUS PICKER ===== */}
      <AnimatePresence initial={false}>
        {showStatusPicker && (
          <motion.div
            key="status-picker"
            variants={pickerVariants}
            initial="closed"
            animate="open"
            exit="closed"
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 pt-1">
              {allStatuses.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSelectStatus(s)}
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== EXPANDED SCORE PICKER ===== */}
      <AnimatePresence initial={false}>
        {showScorePicker && (
          <motion.div
            key="score-picker"
            variants={pickerVariants}
            initial="closed"
            animate="open"
            exit="closed"
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleSelectScore(n)}
                  className={cn(
                    "min-w-[40px] min-h-[40px] rounded-full flex items-center justify-center text-[11px] font-bold border transition-all duration-200 cursor-pointer",
                    currentScore === n
                      ? "bg-primary text-white border-primary shadow-[0_0_10px_rgba(var(--primary),0.5)] z-10 scale-110"
                      : "border-white/10 text-white/50 hover:border-primary/50 hover:text-white hover:bg-primary/10",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== EXPANDED LIST PILLS ===== */}
      <AnimatePresence initial={false}>
        {showListExpanded && listCount > 0 && (
          <motion.div
            key="list-pills"
            variants={pickerVariants}
            initial="closed"
            animate="open"
            exit="closed"
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-2 pt-1">
              {visibleLists.map((list) => (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => router.push(`/lists/${list.id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 text-[11px] font-medium text-white/70 hover:border-violet-500/30 hover:text-violet-300 hover:bg-violet-500/5 transition-all duration-200 cursor-pointer"
                >
                  {list.name}
                </button>
              ))}
              {overflowCount > 0 && (
                <button
                  type="button"
                  onClick={onOpenLists}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-white/15 text-[11px] font-medium text-white/50 hover:border-primary/30 hover:text-primary hover:bg-primary/5 transition-all duration-200 cursor-pointer"
                >
                  +{overflowCount} más
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
