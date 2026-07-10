import { Suspense } from "react";
import HeroSection from "@/components/sections/HeroSection";
import PopularSection from "@/components/sections/PopularSection";
import TrendingSection from "@/components/sections/TrendingSection";
import { AiringTodaySection } from "@/components/sections/AiringTodaySection";
import { ComingSoonSection } from "@/components/sections/ComingSoonSection";
import GridSkeleton from "@/components/Loaders/GridSkeleton";

export const revalidate = 21600;
export const dynamic = "force-static";

export default async function HomePage() {
  return (
    <>
      <HeroSection />

      <main className="relative z-20 px-6 md:px-10 lg:px-16 pb-16 -mt-16 overflow-x-hidden">
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent to-background -z-10 pointer-events-none" />

        <section className="pt-8">
          <Suspense fallback={<GridSkeleton count={10} />}>
            <PopularSection />
          </Suspense>
        </section>

        <section className="mt-8">
          <Suspense fallback={<GridSkeleton count={10} />}>
            <TrendingSection />
          </Suspense>
        </section>

        <section className="mt-8">
          <Suspense fallback={<GridSkeleton count={10} />}>
            <AiringTodaySection />
          </Suspense>
        </section>

        <section className="mt-8">
          <Suspense fallback={<GridSkeleton count={10} />}>
            <ComingSoonSection />
          </Suspense>
        </section>
      </main>
    </>
  );
}
