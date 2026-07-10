import type { HTMLAttributes } from "react";

/**
 * Skeleton — animated placeholder for loading content.
 *
 * Renders a pulsing muted rectangle. Accepts a `className` for sizing.
 *
 * @example
 * ```tsx
 * <Skeleton className="h-48 w-full rounded-xl" />
 * <Skeleton className="h-4 w-3/4" />
 * ```
 */
export default function Skeleton({
  className = "",
  ...props
}: { className?: string } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-muted animate-pulse rounded-md ${className}`}
      {...props}
    />
  );
}