import { Suspense } from "react";
import HeroSection from "@/components/sections/HeroSection";
import PopularSection from "@/components/sections/PopularSection";
import TrendingSection from "@/components/sections/TrendingSection";
import AiringTodaySection from "@/components/sections/AiringTodaySection";
import ComingSoonSection from "@/components/sections/ComingSoonSection";
import GridSkeleton from "@/components/Loaders/GridSkeleton";
import { SectionBoundary } from "@/components/common/SectionBoundary";

// The page stays dynamic because the build environment can't reach the Render
// backend, so pre-rendering would fail. `fetchCache` is what makes that
// survivable: `force-dynamic` otherwise forces every fetch to `no-store`,
// which silently voided the per-endpoint `next: { revalidate }` values in
// lib/api.ts and sent every single visit straight to a backend that sleeps
// after 15min of inactivity. With the data cache back, a cold backend is
// invisible to visitors — Next serves the cached payload and revalidates
// behind them.
export const dynamic = "force-dynamic";
export const fetchCache = "default-cache";
export const maxDuration = 15;

export default function HomePage() {
  // Each section fetches its own data. These are sibling async Server
  // Components, so React starts all of them in parallel — the same concurrency
  // the old `Promise.all` bought, minus its two costs: it blocked the entire
  // page on the slowest request, and one rejection took every section down.
  // Now each shelf streams in as it resolves and fails on its own.
  return (
    <>
      <SectionBoundary>
        <Suspense
          fallback={<div className="h-[70vh] bg-background animate-pulse" />}
        >
          <HeroSection />
        </Suspense>
      </SectionBoundary>

      <main className="relative z-20 px-6 md:px-10 lg:px-16 pb-16 -mt-16 overflow-x-hidden">
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent to-background -z-10 pointer-events-none" />

        <section className="pt-8">
          <SectionBoundary title="Animes populares">
            <Suspense fallback={<GridSkeleton count={10} />}>
              <PopularSection />
            </Suspense>
          </SectionBoundary>
        </section>

        <section className="mt-8">
          <SectionBoundary title="Emisión de Hoy">
            <Suspense fallback={<GridSkeleton count={10} />}>
              <AiringTodaySection />
            </Suspense>
          </SectionBoundary>
        </section>

        <section className="mt-8">
          <SectionBoundary title="Próximamente">
            <Suspense fallback={<GridSkeleton count={10} />}>
              <ComingSoonSection />
            </Suspense>
          </SectionBoundary>
        </section>

        <section className="mt-8">
          <SectionBoundary title="Trending esta temporada">
            <Suspense fallback={<GridSkeleton count={10} />}>
              <TrendingSection />
            </Suspense>
          </SectionBoundary>
        </section>
      </main>
    </>
  );
}
