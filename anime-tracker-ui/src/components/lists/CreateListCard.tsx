"use client";

import Icon from "@/components/custom/Icon";

export function CreateListCard({ onClick }: { onClick: () => void }) {
  return (
    // Scale is CSS rather than framer-motion `whileHover` because the hover
    // reaction has to be gated on the device actually having a hover-capable
    // pointer: on touch, `whileHover` latches on tap and leaves the card stuck
    // shrunk until another element takes the pointer. `motion-safe:` keeps both
    // the hover and the press scale out of the way when the user asked for
    // reduced motion, while the colour transition — which involves no
    // movement — stays on.
    // A real <button>, not a div with onClick: the redesigned ListCard next to
    // it is keyboard reachable now, and leaving the one control that creates a
    // list out of the tab order would be the odd item in the same grid.
    // The aspect is responsive and must stay identical to ListCard and to the
    // CollectionsTab skeletons: two cards per row on phones would make a 3:2
    // tile tall enough to turn the tab into an endless scroll, so the tile is
    // shorter there and only returns to 3:2 from `md` up.
    <button
      type="button"
      className="group relative flex flex-col items-center justify-center w-full aspect-[16/10] md:aspect-[3/2] px-3 text-center rounded-[14px] border-2 border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/50 transition-[background-color,border-color,scale] duration-300 cursor-pointer [@media(hover:hover)]:motion-safe:hover:scale-[0.98] motion-safe:active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      onClick={onClick}
    >
      {/* Two cards per row on phones leave roughly half the width the tile used
          to have, so the circle and the label step down a size to keep the
          copy on a comfortable line count instead of crowding the border. */}
      <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/5 group-hover:bg-primary/20 group-hover:text-primary text-white/40 transition-colors mb-2 sm:mb-3">
        <Icon name="Plus" size={24} />
      </div>
      <p className="text-xs sm:text-sm font-medium text-white/50 group-hover:text-white transition-colors">
        Crear nueva colección
      </p>
    </button>
  );
}
