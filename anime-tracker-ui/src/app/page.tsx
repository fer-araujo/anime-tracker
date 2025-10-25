import { Container } from "@/components/common/Container";
import { MinimalShelf } from "@/components/Shelf";
import { HeroCarouselCinematic } from "@/components/Spotlight";
import { fetchSeason } from "@/lib/api";
import { Anime } from "@/types/anime";

export default async function HomePage() {
  const season = await fetchSeason({ enrich: false });
  const top = season.data[0];
  function scoreHype(a: Anime) {
    const r = a.meta?.rating ?? 0; // 0..10
    const pop = a.meta?.popularity ?? 0; // absoluto
    const fav = a.meta?.favourites ?? 0; // absoluto
    // normalización simple (robusta, no perfecta)
    const popN = Math.log10(1 + pop);
    const favN = Math.log10(1 + fav);
    // ponderación balanceada: rating pesa más, pero hype empuja
    return r * 0.65 + popN * 0.22 + favN * 0.13;
  }

  const heroItems = [...season.data]
    .filter((a) => a.meta?.status !== "finished") // prioriza lo que “mueve” hoy
    .sort((a, b) => scoreHype(b) - scoreHype(a))
    .slice(0, 5);

  return (
    <main className="space-y-12">
      {top && (
        <HeroCarouselCinematic
          items={heroItems}
          // primaryHref={`/anime/${top.id.anilist}`}
          // secondaryHref={`/mi-lista?add=${top.id.anilist}`}
          className="min-h-[calc(100vh-4rem)]"
        />
      )}
      <MinimalShelf
        title="Tendencias de la temporada"
        items={season.data.slice(0, 12)}
      />
      <Container className="py-12"></Container>
      {/* luego tu SmartShelf minimal o una sola sección clave */}
    </main>
  );
}
