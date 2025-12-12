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

      <main className="px-6 md:px-10 lg:px-16 pb-16">
        <section className="mt-10">
          <MinimalShelf
            title="Animes populares"
            items={popularItems}
          />
        </section>
        <section className="mt-8">
          <MinimalShelf
            title="Trending esta temporada"
            items={trendingItems}
          />
        </section>
      </main>
    </>
  );
}
