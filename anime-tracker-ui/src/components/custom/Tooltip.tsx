import type { ReactNode } from "react";
import { useId } from "react";

/**
 * CSS-only tooltip that appears on hover using `group-hover`.
 *
 * No JS runtime, no @radix-ui dependency. Accessible via `aria-describedby`
 * and `role="tooltip"`.
 *
 * @example
 * ```tsx
 * <Tooltip content="Search anime">
 *   <button>🔍</button>
 * </Tooltip>
 *
 * <Tooltip content="Details" side="bottom">
 *   <span>ℹ️</span>
 * </Tooltip>
 * ```
 */
export default function Tooltip({
  content,
  children,
  side = "top",
}: {
  /** Visible tooltip text. */
  content: string;
  /** The trigger element. */
  children: ReactNode;
  /** Preferred side: "top" (default) or "bottom". */
  side?: "top" | "bottom";
}) {
  const id = useId();
  const tooltipId = `tooltip-${id}`;

  const positionClasses =
    side === "bottom"
      ? "top-full left-1/2 -translate-x-1/2 mt-1.5"
      : "bottom-full left-1/2 -translate-x-1/2 mb-1.5";

  return (
    <span className="group/tooltip relative inline-flex">
      <span aria-describedby={tooltipId}>{children}</span>
      <span
        role="tooltip"
        id={tooltipId}
        className={`
          pointer-events-none absolute z-50
          whitespace-normal break-words max-w-[min(90vw,35rem)]
          rounded-md border border-neutral-700 bg-neutral-800
          px-3 py-2 text-sm text-foreground
          shadow-md shadow-black/30 leading-relaxed
          opacity-0 transition-opacity duration-150
          group-hover/tooltip:opacity-100
          ${positionClasses}
        `}
      >
        {content}
      </span>
    </span>
  );
}