"use client";

import { cn } from "@/lib/utils";
import type { SeasonFormatCount, SeasonFormatKey } from "@/types/season";

type Props = {
  chips: SeasonFormatCount[];
  active: SeasonFormatKey;
  onChange: (key: SeasonFormatKey) => void;
  className?: string;
};

/**
 * Format filter for the season page.
 *
 * A filter rather than section headings, because pagination has to keep meaning
 * something: it always walks one flat list, so it recomputes against whatever
 * chip is selected. Headings would split a bucket across page boundaries.
 *
 * The counts are the reason the row earns its space — seeing "Películas 2"
 * reports the shape of the season without reorganising the page to show it.
 */
export function SeasonFormatChips({
  chips,
  active,
  onChange,
  className,
}: Props) {
  // One chip is not a filter, it is a label for the only thing there is.
  if (chips.length <= 1) return null;

  return (
    <div
      role="group"
      aria-label="Filtrar por formato"
      className={cn("flex flex-wrap gap-2", className)}
    >
      {chips.map((chip) => {
        const selected = chip.key === active;
        return (
          <button
            key={chip.key}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(chip.key)}
            className={cn(
              // h-10 and rounded-xl are not arbitrary: they are what every
              // other control in this panel already uses. A pill among
              // rectangles reads as belonging to a different toolbar.
              "inline-flex h-10 items-center gap-1.5 rounded-xl border px-4",
              "text-sm font-medium transition-colors cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              selected
                ? "bg-primary/20 border-primary/30 text-primary"
                : "bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10",
            )}
          >
            {chip.label}
            <span
              className={cn(
                "text-[10px] tabular-nums rounded-full px-1.5 py-0.5",
                selected
                  ? "bg-primary/30 text-white"
                  : "bg-white/10 text-white/50",
              )}
            >
              {chip.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
