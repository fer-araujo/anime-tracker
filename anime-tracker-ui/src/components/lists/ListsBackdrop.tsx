/* -------------------------------------------------------------------------- */
/*  ListsBackdrop — decorative ambience for the lists surfaces                 */
/* -------------------------------------------------------------------------- */

/**
 * Why the glow is anchored at the BOTTOM:
 * Header.tsx is `fixed top-0 z-50`. Unscrolled it paints
 * `from-black/90 via-black/40 to-transparent` over the top of the page, so a
 * top-anchored glow would have its brightest region buried under the header's
 * own black scrim. Once scrolled, the header swaps to `backdrop-blur-xl`, which
 * SAMPLES whatever sits behind it — a top-anchored green would bleed through
 * and tint the navbar. The bottom of the viewport is the only region no header
 * treatment touches.
 *
 * Why `fixed` instead of anchoring to the page container:
 * the container grows with content, so a container-anchored gradient sinks to
 * the bottom of the DOCUMENT and only becomes visible after scrolling all the
 * way down. `fixed` pins it to the bottom of the VIEWPORT, where it reads on
 * every scroll position.
 *
 * Why no `blur()` filter:
 * the previous orb relied on `blur-[120px]`, a filter pass that is expensive to
 * paint on a full-screen layer. A radial-gradient is already soft by
 * construction and needs no filter at all.
 *
 * Why `z-0` and NOT a negative z-index:
 * the CSS painting algorithm paints negative-z-index descendants at step 3, but
 * the backgrounds of in-flow, non-positioned block boxes at step 4 — i.e. AFTER.
 * This backdrop is a child of the lists page container, so ANY opaque
 * `bg-background` on that container (or on any plain block ancestor) would paint
 * straight over it and the gradient would never be seen. That is exactly what
 * happened to the orb this replaced, which is why it read as "casi invisible".
 * At `z-0` the backdrop is a positioned descendant painted at step 8, above
 * those block backgrounds; the page content then needs `relative z-10` to stay
 * on top of it. Ownership of the opaque base moves here: the first child below
 * paints `bg-background` across the full viewport, so the page container must
 * NOT repeat it.
 */
export function ListsBackdrop() {
  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-background" />
      {/* Primary green (--color-primary: hsl(142 72% 45%)) at low alpha, using
          the same raw-hsl arbitrary-value syntax as AuthBackground.tsx. */}
      <div className="absolute inset-0 bg-[radial-gradient(85%_50%_at_50%_106%,hsl(142_72%_45%/0.10)_0%,transparent_72%)]" />
    </div>
  );
}
