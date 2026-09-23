import type { CSSProperties } from "react";
import { SURFACE_HUES } from "@/lib/surface";
import type { SurfaceHue } from "@/types/surface";

/* -------------------------------------------------------------------------- */
/*  SurfaceBackdrop — the one ambient backdrop every page shares               */
/* -------------------------------------------------------------------------- */

/**
 * One backdrop, one geometry, one alpha; the tone is the only variable.
 *
 * Lists, the season and recommendations used to solve this three ways — a
 * bottom-anchored green on lists, a seasonal tint across the top of the season
 * page, and nothing at all on recommendations — so moving between them read as
 * moving between apps. The geometry and alpha here are the ones calibrated on
 * lists; the other surfaces inherit them rather than being tuned separately.
 *
 * Why the glow is anchored at the BOTTOM:
 * Header.tsx is `fixed top-0 z-50`. Unscrolled it paints
 * `from-black/90 via-black/40 to-transparent` over the top of the page, so a
 * top-anchored glow would have its brightest region buried under the header's
 * own black scrim. Once scrolled, the header swaps to `backdrop-blur-xl`, which
 * SAMPLES whatever sits behind it — a top-anchored colour bleeds through and
 * tints the navbar. That is exactly what the season page's old top tint did.
 * The bottom of the viewport is the only region no header treatment touches.
 *
 * Why `fixed` instead of anchoring to the page container:
 * the container grows with content, so a container-anchored gradient sinks to
 * the bottom of the DOCUMENT and only becomes visible after scrolling all the
 * way down. `fixed` pins it to the bottom of the VIEWPORT.
 *
 * Why no `blur()` filter:
 * a radial-gradient is already soft by construction; a full-screen blur is an
 * expensive paint for nothing.
 *
 * Why `z-0` and NOT a negative z-index:
 * the CSS painting algorithm paints negative-z-index descendants BEFORE the
 * backgrounds of in-flow blocks and of positioned ancestors, so any opaque
 * `bg-background` above it covers it completely. That buried the orb this
 * replaced on lists, and it buried the season page's hero image, which sat at
 * `-z-10` inside a `bg-background` container and never showed. At `z-0` this
 * paints above those backgrounds; page content needs `relative z-10`.
 * Ownership of the opaque base moves here, so a page using this must NOT paint
 * `bg-background` on its own container.
 *
 * Two sizes, because the radii are percentages OF THE VIEWPORT. At 85% of a
 * ~390px phone the ellipse is ~330px across and bunched into the bottom edge,
 * so the mobile variant is wider than the screen and taller, and a little
 * stronger: the same colour spread over less surface reads weaker.
 *
 * The tone arrives as a CSS variable, not a class per hue: Tailwind only
 * generates classes it can find written out whole, so a class assembled from
 * the hue at runtime would never exist.
 */
export function SurfaceBackdrop({ hue = "primary" }: { hue?: SurfaceHue }) {
  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
      style={{ "--surface-hue": SURFACE_HUES[hue] } as CSSProperties}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-[radial-gradient(150%_55%_at_50%_104%,hsl(var(--surface-hue)/0.07)_0%,transparent_75%)] md:bg-[radial-gradient(85%_50%_at_50%_106%,hsl(var(--surface-hue)/0.055)_0%,transparent_72%)]" />
    </div>
  );
}
