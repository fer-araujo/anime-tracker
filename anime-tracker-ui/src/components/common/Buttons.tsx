import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";

export const ActionButton = ({
  children,
  onClick,
  variant = "solid",
  icon,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "solid" | "soft";
  icon?: React.ReactNode;
}) => {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-white border focus:outline-none hover:cursor-pointer focus:ring-2 focus:ring-white/40 transition-colors h-8 px-2.5";
  const styles =
    variant === "solid"
      ? "border-white/15 bg-white/10 hover:bg-white/15"
      : "border-white/15 bg-white/5 hover:bg-white/10";
  return (
    <button type="button" onClick={onClick} className={cn(base, styles)}>
      {icon}
      <span className="truncate">{children}</span>
    </button>
  );
};

export const FavButton = ({
  active,
  onClick,
}: {
  active: boolean;
  onClick?: () => void;
}) => {
  return (
    <button
      type="button"
      aria-label={active ? "Quitar de favoritos" : "Agregar a favoritos"}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-lg text-white border transition-colors focus:outline-none focus:ring-2 h-8 w-8 hover:cursor-pointer",
        active
          ? "border-pink-400/40 bg-pink-500/20 hover:bg-pink-500/25 focus:ring-pink-300/40"
          : "border-white/15 bg-white/5 hover:bg-white/10 focus:ring-white/40"
      )}
      title={active ? "Favorito" : "Agregar a favoritos"}
    >
      <Heart
        size={16}
        strokeWidth={1.8}
        className={cn(active ? "fill-pink-300 text-pink-300" : "text-white/80")}
      />
    </button>
  );
};
