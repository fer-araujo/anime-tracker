import { Container } from "@/components/common/Container";
import { MinimalShelf } from "@/components/Shelf";
import { HeroCarouselCinematic } from "@/components/Spotlight";
import { fetchHomeHero, fetchSeason } from "@/lib/api";

export default async function HomePage() {
  const hero = await fetchHomeHero();
  const heroItems = hero.data.slice(0, 5);

  const season = await fetchSeason({ enrich: false });

  return (
    <main className="space-y-12">
      {heroItems.length > 0 && (
        <HeroCarouselCinematic
          items={heroItems}
          className="min-h-[calc(100vh-4rem)]"
        />
      )}
      <MinimalShelf
        title="Popular esta temporada"
        items={season.data.slice(0, 12)}
      />
      <Container className="py-12" />
    </main>
  );
}
