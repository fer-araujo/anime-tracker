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
    <button
      type="button"
      className="group relative flex flex-col items-center justify-center w-full aspect-[3/2] rounded-[14px] border-2 border-dashed border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/50 transition-[background-color,border-color,scale] duration-300 cursor-pointer [@media(hover:hover)]:motion-safe:hover:scale-[0.98] motion-safe:active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
