import { fetchHomeHero } from "@/lib/api";
import { HeroCarouselCinematic } from "@/components/Spotlight";
import type { Anime } from "@/types/anime";

export default async function HeroSection() {
  const resp = await fetchHomeHero();
  const raw = resp.data ?? [];
  if (raw.length === 0) return null;
  const items = raw.map(
    (item) =>
      ({
        id: item.id,
        title: item.title,
        providers: [],
        images: item.images,
        meta: item.meta,
      }) as Anime,
  );
  return <HeroCarouselCinematic items={items} />;
}
