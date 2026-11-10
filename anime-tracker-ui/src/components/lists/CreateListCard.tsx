"use client";

import Icon from "@/components/custom/Icon";
import { CARD_HOVER_SHADOW } from "@/lib/cardStyles";
import { cn } from "@/lib/utils";

export function CreateListCard({ onClick }: { onClick: () => void }) {
  return (
    // No hover shrink: every other card lifts with the shared shadow, and this
    // one belongs to the same family. `motion-safe:` keeps the press scale out
    // of the way when the user asked for reduced motion.
    // A real <button>, not a div with onClick: the redesigned ListCard next to
    // it is keyboard reachable now, and leaving the one control that creates a
    // list out of the tab order would be the odd item in the same grid.
    // Sizing must stay identical to ListCard and the CollectionsTab skeletons.
    // On phones that is the favorites banner's height (`h-36 sm:h-44`) so the
    // whole column reads as one family of objects; from `md` the grid goes
    // multi-column and height comes from the 3:2 ratio again.
    <button
      type="button"
      className={cn(
        "group relative flex flex-col items-center justify-center w-full h-36 sm:h-44 md:h-auto md:aspect-[3/2] px-3 text-center rounded-[14px] border-2 border-dashed border-white/10 bg-white/[0.02] cursor-pointer",
        "hover:bg-white/[0.05] hover:border-white/25 motion-safe:active:scale-[0.95]",
        CARD_HOVER_SHADOW,
        // The token's transition-shadow and this list both set transition-property, and
        // cn() does not merge them, so `!` makes the fill, border and press scale animate
        // alongside the shadow instead of snapping.
        "transition-[background-color,border-color,box-shadow,scale]!",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/5 group-hover:bg-primary/20 group-hover:text-primary text-white/40 transition-colors mb-3">
        <Icon name="Plus" size={24} />
      </div>
      <p className="text-sm font-medium text-white/50 group-hover:text-white transition-colors">
        Crear nueva colección
      </p>
    </button>
  );
}
