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
    default:
      "border-transparent bg-primary text-primary-foreground",
    secondary:
      "border-transparent bg-secondary text-secondary-foreground",
    outline:
      "text-foreground border",
    destructive:
      "border-transparent bg-destructive text-destructive-foreground",
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 ${
        variantClasses[variant]
      } ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}