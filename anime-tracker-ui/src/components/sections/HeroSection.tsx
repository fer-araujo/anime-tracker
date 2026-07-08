import { fetchHomeHero } from "@/lib/api";
import { HeroCarouselCinematic } from "@/components/Spotlight";

export default async function HeroSection() {
  const resp = await fetchHomeHero();
  const items = resp.data ?? [];
  if (items.length === 0) return null;
  return <HeroCarouselCinematic items={items} />;
}
