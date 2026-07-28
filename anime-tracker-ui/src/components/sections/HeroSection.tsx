import { fetchHomeHero } from "@/lib/api";
import { HeroCarouselCinematic } from "@/components/Spotlight";
import type { Anime } from "@/types/anime";

export default async function HeroSection({
  data,
}: {
  data?: Anime[];
}) {
  let items: Anime[];
  if (data) {
    items = data;
  } else {
    const resp = await fetchHomeHero();
    const raw = resp.data ?? [];
    items = raw.map(
      (item) =>
        ({
          id: item.id,
          title: item.title,
          providers: [],
          images: item.images,
          meta: item.meta,
        }) as Anime,
    );
  }
  if (items.length === 0) return null;
  return <HeroCarouselCinematic items={items} />;
}
