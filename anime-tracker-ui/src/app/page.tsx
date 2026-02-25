// src/app/page.tsx
import { MinimalShelf } from "@/components/Shelf";
import { HeroCarouselCinematic } from "@/components/Spotlight";
import { fetchHomeHero, fetchSeason } from "@/lib/api";

export default async function HomePage() {
  const [heroResp, trendingResp, popularResp] = await Promise.all([
    fetchHomeHero(),
    fetchSeason({ rank: "trending" }),
    fetchSeason({ rank: "popular" }),
  ]);

  const heroItems = heroResp.data;
  const popularItems = popularResp.data;
  const trendingItems = trendingResp.data;
  
  return (
    <>
      {heroItems.length > 0 && <HeroCarouselCinematic items={heroItems} />}

      <main className="relative z-20 px-6 md:px-10 lg:px-16 pb-16 -mt-16 overflow-x-hidden">
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent to-background -z-10 pointer-events-none" />

        <section className="pt-8">
          <MinimalShelf title="Animes populares" items={popularItems} />
        </section>

        <section className="mt-8">
          <MinimalShelf title="Trending esta temporada" items={trendingItems} />
        </section>
      </main>
    </>
  );
}
