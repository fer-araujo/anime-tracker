import type { ReactNode, HTMLAttributes } from "react";

/**
 * Available badge style variants.
 */
export type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

/**
 * Badge component — a small label for status, categories, or counts.
 *
 * Tailwind CSS v4 only — no cn(), no cva, no clsx.
 *
 * @example
 * ```tsx
 * <Badge variant="destructive">Expired</Badge>
 * <Badge variant="outline" className="ml-2">Draft</Badge>
 * ```
 */
export default function Badge({
  variant = "default",
  className = "",
  children,
  ...props
}: {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
} & HTMLAttributes<HTMLSpanElement>) {
  const variantClasses: Record<BadgeVariant, string> = {
    default: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary",
    outline: "border text-muted-foreground",
    destructive: "bg-destructive/10 text-destructive",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold ${
        variant === "outline" ? "border" : "border-transparent"
      } ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}