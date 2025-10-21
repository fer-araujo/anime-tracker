import { cn } from "@/lib/utils";

export const Pill = ({
  tone,
  children,
  ariaLabel,
}: {
  tone: "amber" | "rose" | "emerald" | "sky" | "slate";
  children: React.ReactNode;
  ariaLabel?: string;
}) => {
  const base =
    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border";
  const map: Record<string, string> = {
    amber:
      "bg-gradient-to-r from-yellow-400/45 to-amber-500/45 text-yellow-100 border-yellow-400/35",
    rose: "bg-gradient-to-r from-rose-500/50 to-red-600/50 text-rose-50 border-rose-400/40",
    emerald:
      "bg-gradient-to-r from-emerald-500/45 to-teal-500/45 text-emerald-50 border-emerald-400/35",
    sky: "bg-gradient-to-r from-sky-500/65 to-cyan-500/65 text-sky-50 border-sky-300/45",
    slate:
      "bg-gradient-to-r from-slate-500/50 to-zinc-600/50 text-slate-50 border-slate-300/40",
  };
  return (
    <span className={cn(base, map[tone])} aria-label={ariaLabel}>
      {children}
    </span>
  );
};
