import { Suspense } from "react";
import HeroSection from "@/components/sections/HeroSection";
import PopularSection from "@/components/sections/PopularSection";
import TrendingSection from "@/components/sections/TrendingSection";
import AiringTodaySection from "@/components/sections/AiringTodaySection";
import ComingSoonSection from "@/components/sections/ComingSoonSection";
import GridSkeleton from "@/components/Loaders/GridSkeleton";
import { fetchHomeHero, fetchSeason, fetchAiringToday, fetchComingSoon } from "@/lib/api";
import type { Anime } from "@/types/anime";

export const revalidate = 21600;
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [heroResp, popularResp, trendingResp, airingData, comingData] =
    await Promise.all([
      fetchHomeHero(),
      fetchSeason({ rank: "popular" }),
      fetchSeason({ rank: "trending" }),
      fetchAiringToday(),
      fetchComingSoon(),
    ]);

  const heroData: Anime[] = (heroResp.data ?? []).map(
    (item) =>
      ({
        id: item.id,
        title: item.title,
        providers: [],
        images: item.images,
        meta: item.meta,
      }) as Anime,
  );

  return (
    <>
      <Suspense fallback={<div className="h-[70vh] bg-background animate-pulse" />}>
        <HeroSection data={heroData} />
      </Suspense>

      <main className="relative z-20 px-6 md:px-10 lg:px-16 pb-16 -mt-16 overflow-x-hidden">
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent to-background -z-10 pointer-events-none" />

        <section className="pt-8">
          <Suspense fallback={<GridSkeleton count={10} />}>
            <PopularSection data={popularResp.data} />
          </Suspense>
        </section>

        <section className="mt-8">
          <Suspense fallback={<GridSkeleton count={10} />}>
            <AiringTodaySection data={airingData} />
          </Suspense>
        </section>

        <section className="mt-8">
          <Suspense fallback={<GridSkeleton count={10} />}>
            <ComingSoonSection data={comingData} />
          </Suspense>
        </section>

        <section className="mt-8">
          <Suspense fallback={<GridSkeleton count={10} />}>
            <TrendingSection data={trendingResp.data} />
          </Suspense>
        </section>
      </main>
    </>
  );
}
