import { cn } from "@/lib/utils";
import Icon from "@/components/custom/Icon";

type ActionButtonAs = "button" | "a";

type ActionButtonProps =
  | {
      as?: "button";
      children: React.ReactNode;
      onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
      variant?: "primary" | "solid" | "soft";
      icon?: React.ReactNode;
      size?: "sm" | "md";
    }
  | {
      as: "a";
      children: React.ReactNode;
      onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
      href?: string;
      target?: string;
      rel?: string;
      variant?: "primary" | "solid" | "soft";
      icon?: React.ReactNode;
      size?: "sm" | "md";
    };

export const ActionButton = (props: ActionButtonProps) => {
  const {
    children,
    onClick,
    variant = "solid",
    icon,
    size = "sm",
    as,
    ...rest
  } = props;

  const base = cn(
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold text-white border focus:outline-none hover:cursor-pointer focus:ring-2 focus:ring-white/40 transition-colors",
    size === "sm" ? "text-xs h-8 px-2.5" : "text-sm h-10 px-4",
  );
  const styles =
    variant === "primary"
      ? "bg-primary text-primary-foreground border-transparent hover:bg-primary-hover"
      : variant === "solid"
        ? "border-white/15 bg-white/10 hover:bg-white/15"
        : "border-white/15 bg-white/5 hover:bg-white/10";

  if (as === "a") {
    const { href, target, rel } = rest as {
      href?: string;
      target?: string;
      rel?: string;
    };
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        onClick={onClick as React.MouseEventHandler<HTMLAnchorElement>}
        className={cn(base, styles)}
      >
        {icon}
        <span className="truncate">{children}</span>
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick as React.MouseEventHandler<HTMLButtonElement>} className={cn(base, styles)}>
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
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
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
          : "border-white/15 bg-white/5 hover:bg-white/10 focus:ring-white/40",
      )}
      title={active ? "Favorito" : "Agregar a favoritos"}
    >
      <Icon
        name="Heart"
        size={16}
        className={cn(active ? "text-pink-300" : "text-white/80")}
      />
    </button>
  );
};
