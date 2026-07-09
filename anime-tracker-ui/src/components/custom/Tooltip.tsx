import type { ReactNode } from "react";
import { useId, useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Portal-based tooltip that renders at `document.body` level via `createPortal`,
 * avoiding clipping by `overflow-hidden` ancestors.
 *
 * Positions itself relative to the trigger element using `getBoundingClientRect()`
 * with viewport edge detection (flips to opposite side when insufficient space).
 * Accessible via `aria-describedby` and `role="tooltip"`.
 *
 * No external dependencies — uses built-in React APIs only.
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

  // State machine: idle -> measuring -> visible -> (hidden resets to idle)
  const [tooltipState, setTooltipState] = useState<
    "idle" | "measuring" | "visible"
  >("idle");
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  /** Compute tooltip position with viewport edge detection and side flipping. */
  const computePosition = useCallback(
    (
      triggerRect: DOMRect,
      tooltipHeight: number,
      preferredSide: "top" | "bottom",
    ) => {
      const margin = 8;
      const spaceAbove = triggerRect.top - margin;
      const spaceBelow = window.innerHeight - triggerRect.bottom - margin;

      let finalSide = preferredSide;
      if (
        preferredSide === "top" &&
        spaceAbove < tooltipHeight + margin &&
        spaceBelow >= tooltipHeight + margin
      ) {
        finalSide = "bottom";
      } else if (
        preferredSide === "bottom" &&
        spaceBelow < tooltipHeight + margin &&
        spaceAbove >= tooltipHeight + margin
      ) {
        finalSide = "top";
      }

      return {
        top:
          finalSide === "top"
            ? triggerRect.top - tooltipHeight - margin
            : triggerRect.bottom + margin,
        left: triggerRect.left + triggerRect.width / 2,
      };
    },
    [],
  );

  const showTooltip = useCallback(() => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    // Estimated height — refined after the tooltip element is rendered and measured
    const estimatedHeight = 40;

    const { top, left } = computePosition(triggerRect, estimatedHeight, side);
    setPosition({ top, left });
    setTooltipState("measuring");
  }, [side, computePosition]);

  const hideTooltip = useCallback(() => {
    setTooltipState("idle");
    setPosition(null);
  }, []);

  // After the tooltip renders in "measuring" state, measure its actual height
  // and refine the position before transitioning to "visible".
  useEffect(() => {
    if (tooltipState !== "measuring") return;
    if (!tooltipRef.current || !triggerRef.current) return;

    const tooltipHeight = tooltipRef.current.offsetHeight;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const { top, left } = computePosition(triggerRect, tooltipHeight, side);

    setPosition({ top, left });
    setTooltipState("visible");
  }, [tooltipState, side, computePosition]);

  // Scroll/resize listener: reposition while visible, hide if trigger leaves viewport
  useEffect(() => {
    if (tooltipState !== "visible") return;

    const handleViewportChange = () => {
      if (!triggerRef.current) {
        hideTooltip();
        return;
      }

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const margin = 8;

      // Hide if trigger scrolled out of viewport
      if (
        triggerRect.bottom < -margin ||
        triggerRect.top > window.innerHeight + margin ||
        triggerRect.left > window.innerWidth + margin ||
        triggerRect.right < -margin
      ) {
        hideTooltip();
        return;
      }

      const tooltipHeight = tooltipRef.current?.offsetHeight ?? 40;
      const { top, left } = computePosition(triggerRect, tooltipHeight, side);

      // Direct style mutation — avoids re-render on every scroll tick
      if (tooltipRef.current) {
        tooltipRef.current.style.top = `${top}px`;
        tooltipRef.current.style.left = `${left}px`;
        tooltipRef.current.style.transform = "translateX(-50%)";
      }
    };

    window.addEventListener("scroll", handleViewportChange, { passive: true });
    window.addEventListener("resize", handleViewportChange, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleViewportChange);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, [tooltipState, side, computePosition, hideTooltip]);

  // Cleanup portal node on unmount
  useEffect(() => {
    return () => {
      hideTooltip();
    };
  }, [hideTooltip]);

  const isVisible = tooltipState === "measuring" || tooltipState === "visible";

  return (
    <>
      <span
        ref={triggerRef}
        className="inline-flex"
        aria-describedby={tooltipId}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        {children}
      </span>
      {typeof document !== "undefined" && isVisible && position
        ? createPortal(
            <div
              ref={tooltipRef}
              id={tooltipId}
              role="tooltip"
              style={{
                position: "fixed",
                top: position.top,
                left: position.left,
                transform: "translateX(-50%)",
                zIndex: 50,
                pointerEvents: "none",
                opacity: tooltipState === "measuring" ? 0 : 1,
              }}
              className="whitespace-normal break-words max-w-[min(90vw,35rem)] rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-foreground shadow-md shadow-black/30 leading-relaxed transition-opacity duration-150"
            >
              {content}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
