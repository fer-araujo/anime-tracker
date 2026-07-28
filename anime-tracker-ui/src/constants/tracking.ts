import type { IconName } from "@/components/custom/Icon";
import type { TrackingStatus } from "@/types/anime";

export const STATUS_LABELS: Record<TrackingStatus, string> = {
  watching: "Viendo",
  completed: "Completado",
  on_hold: "En pausa",
  dropped: "Abandonado",
  plan_to_watch: "Plan para ver",
};

export const STATUS_ICONS: Record<TrackingStatus, IconName> = {
  watching: "Play",
  completed: "Check",
  on_hold: "Clock",
  dropped: "X",
  plan_to_watch: "List",
};

export const STATUS_COLORS: Record<
  TrackingStatus,
  { active: string; hover: string }
> = {
  watching: {
    active:
      "border-sky-500/50 text-sky-300 bg-sky-500/10 shadow-[0_0_15px_rgba(14,165,233,0.15)]",
    hover:
      "border-white/10 text-white/50 hover:border-sky-500/30 hover:text-sky-400 hover:bg-sky-500/5",
  },
  completed: {
    active:
      "border-emerald-500/50 text-emerald-300 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]",
    hover:
      "border-white/10 text-white/50 hover:border-emerald-500/30 hover:text-emerald-400 hover:bg-emerald-500/5",
  },
  on_hold: {
    active:
      "border-amber-500/50 text-amber-300 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.15)]",
    hover:
      "border-white/10 text-white/50 hover:border-amber-500/30 hover:text-amber-400 hover:bg-amber-500/5",
  },
  dropped: {
    active:
      "border-red-500/50 text-red-300 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.15)]",
    hover:
      "border-white/10 text-white/50 hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/5",
  },
  plan_to_watch: {
    active:
      "border-white/30 text-white bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]",
    hover:
      "border-white/10 text-white/50 hover:border-white/30 hover:text-white hover:bg-white/5",
  },
};
