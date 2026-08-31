"use client";

import Icon from "@/components/custom/Icon";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/types/view";

type Props = {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
};

const MODES: {
  key: ViewMode;
  label: string;
  icon: "LayoutGrid" | "List";
}[] = [
  { key: "grid", label: "Cuadrícula", icon: "LayoutGrid" },
  { key: "list", label: "Lista", icon: "List" },
];

/**
 * Grid or list, for any surface that shows several anime at once.
 *
 * Shared rather than per-page: season, recommendations and collections all
 * offer the same choice, and three copies of a two-button control drift the
 * moment one of them is styled.
 *
 * Icon-only with an accessible name rather than icon-plus-text. Wherever it
 * sits, the row around it already wraps on phones, and this is the width worth
 * not spending — especially since the list mode exists for that breakpoint.
 */
export function ViewToggle({ value, onChange }: Props) {
  return (
    <div
      role="group"
      aria-label="Modo de vista"
      className="flex items-center gap-1 h-10 p-1 rounded-xl bg-white/5 border border-white/10"
    >
      {MODES.map((mode) => {
        const selected = mode.key === value;
        return (
          <button
            key={mode.key}
            type="button"
            aria-pressed={selected}
            aria-label={mode.label}
            title={mode.label}
            onClick={() => onChange(mode.key)}
            className={cn(
              "h-8 w-9 grid place-items-center rounded-lg transition-colors cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              selected
                ? "bg-primary/20 text-primary"
                : "text-white/50 hover:text-white hover:bg-white/10",
            )}
          >
            <Icon name={mode.icon} size={16} />
          </button>
        );
      })}
    </div>
  );
}
