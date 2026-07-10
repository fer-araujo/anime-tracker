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
  synopsisLang,
}: {
  /** Visible tooltip text. */
  content: string;
  /** The trigger element. */
  children: ReactNode;
  /** Preferred side: "top" (default) or "bottom". */
  side?: "top" | "bottom";
  /** Language of the synopsis content; renders badge when not "es". */
  synopsisLang?: "es" | "en" | null;
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
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const measuringAbortRef = useRef(false);

  /** Compute tooltip position with viewport edge detection and side flipping.
   *  Returns the EXACT top-left corner of the tooltip element (no translateX needed). */
  const computePosition = useCallback(
    (
      triggerRect: DOMRect,
      tooltipHeight: number,
      tooltipWidth: number,
      preferredSide: "top" | "bottom",
    ) => {
      const margin = 8;

      // Y-axis: flip side if insufficient space
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

      const top =
        finalSide === "top"
          ? triggerRect.top - tooltipHeight - margin
          : triggerRect.bottom + margin;

      // X-axis: center on trigger, then clamp to viewport bounds
      const idealLeft = triggerRect.left + (triggerRect.width - tooltipWidth) / 2;
      const left = Math.max(
        margin,
        Math.min(idealLeft, window.innerWidth - tooltipWidth - margin),
      );

      return { top, left };
    },
    [],
  );

  const showTooltip = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    measuringAbortRef.current = false;
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    // Estimated dimensions — refined after tooltip renders and is measured
    const estimatedHeight = 40;
    const estimatedWidth = 200;

    const { top, left } = computePosition(
      triggerRect,
      estimatedHeight,
      estimatedWidth,
      side,
    );
    setPosition({ top, left });
    setTooltipState("measuring");
  }, [side, computePosition]);

  const hideTooltip = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    measuringAbortRef.current = true;
    hideTimeoutRef.current = setTimeout(() => {
      setTooltipState("idle");
      setPosition(null);
    }, 150);
  }, []);

  // After the tooltip renders in "measuring" state, measure its actual
  // dimensions and refine the position before transitioning to "visible".
  useEffect(() => {
    if (tooltipState !== "measuring") return;
    if (!tooltipRef.current || !triggerRef.current) return;

    // Bail if a hide was requested during measurement (stale abort guard)
    if (measuringAbortRef.current) return;

    const tooltipHeight = tooltipRef.current.offsetHeight;
    const tooltipWidth = tooltipRef.current.offsetWidth;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const { top, left } = computePosition(
      triggerRect,
      tooltipHeight,
      tooltipWidth,
      side,
    );

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
      const tooltipWidth = tooltipRef.current?.offsetWidth ?? 200;
      const { top, left } = computePosition(
        triggerRect,
        tooltipHeight,
        tooltipWidth,
        side,
      );

      // Direct style mutation — avoids re-render on every scroll tick
      if (tooltipRef.current) {
        tooltipRef.current.style.top = `${top}px`;
        tooltipRef.current.style.left = `${left}px`;
        tooltipRef.current.style.transform = "none";
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
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

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
                  zIndex: 50,
                  pointerEvents: "auto",
                  opacity: tooltipState === "measuring" ? 0 : 1,
                }}
                className="whitespace-normal break-words max-w-[min(90vw,35rem)] rounded-md border border-neutral-600 bg-neutral-900/95 backdrop-blur-sm px-4 py-3 text-sm text-foreground shadow-lg shadow-black/40 leading-relaxed transition-opacity duration-150"
                onMouseEnter={() => {
                  if (hideTimeoutRef.current) {
                    clearTimeout(hideTimeoutRef.current);
                    hideTimeoutRef.current = null;
                  }
                }}
                onMouseLeave={() => hideTooltip()}
              >
                {content}
                {synopsisLang && synopsisLang !== "es" && (
                  <div className="flex items-center gap-1 mt-3 pt-2 border-t border-white/10 text-[11px] text-white/40">
                    🇬🇧 Solo disponible en inglés
                  </div>
                )}
              </div>,
            document.body,
          )
        : null}
    </>
  );
}
