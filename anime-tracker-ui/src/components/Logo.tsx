import { cn } from "@/lib/utils";

export function AnimeTrackerLogo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 group shrink-0 cursor-pointer",
        className,
      )}
    >
      {/* EL TEXTO DEL LOGO */}
      <div className="flex flex-col justify-center  sm:flex -space-y-0.5">
        <span className="text-lg font-black tracking-widest uppercase leading-none group-hover:text-white/90 transition-colors bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          Anime
        </span>
        <span className="text-[11px] font-bold tracking-[0.25em] uppercase leading-none bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
          Tracker
        </span>
      </div>
    </div>
  );
}
