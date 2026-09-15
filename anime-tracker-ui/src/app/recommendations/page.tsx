import { Suspense } from "react";
import type { Metadata } from "next";
import { RecommendationsPage } from "@/components/recommendations/RecommendationsPage";
import GridSkeleton from "@/components/Loaders/GridSkeleton";

export const metadata: Metadata = {
  title: "Recomendaciones",
  description:
    "Anime elegido a partir de tus favoritos y de las series que mejor has puntuado.",
};

/**
 * The boundary is required, not decorative.
 *
 * The page reads `?view` through `useSearchParams`, which forces a bail out of
 * static prerendering; without a Suspense boundary to bail *into*, the build
 * fails outright rather than degrading. `/season` never hit this because its
 * route awaits `searchParams`, which opts the whole route into dynamic
 * rendering — this one is synchronous, so Next tries to prerender it.
 *
 * Suspense rather than `force-dynamic`: the shell, heading and metadata stay
 * static, and only the part that actually depends on the URL waits.
 */
export default function RecommendationsRoute() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <main className="max-w-[1400px] mx-auto px-4 md:px-10 lg:px-16 pt-32 md:pt-40">
            <div className="h-14 w-72 bg-white/5 rounded-lg animate-pulse mb-10" />
            <GridSkeleton variant="grid" count={10} />
          </main>
        </div>
      }
    >
      <RecommendationsPage />
    </Suspense>
  );
}
