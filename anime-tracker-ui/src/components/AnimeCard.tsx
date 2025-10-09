import Image from "next/image";
import { ProviderBadge } from "./ProviderBadge";
import { Card, CardContent } from "@/components/ui/card";

type Anime = {
  id: { anilist: number; tmdb: number | null };
  title: string;
  poster: string | null;
  providers: string[];
  meta?: { genres?: string[]; rating?: number | null };
};

export function AnimeCard({ anime }: { anime: Anime }) {
  return (
    <Card className="bg-card border-neutral-800 overflow-hidden rounded-2xl shadow-soft">
      <div className="relative w-full h-64 bg-muted">
        {anime.poster ? (
          <Image
            src={anime.poster}
            alt={anime.title}
            fill
            className="object-cover"
            sizes="(max-width:768px) 100vw, 33vw"
            priority={false}
          />
        ) : null}
      </div>
      <CardContent className="p-3">
        <h3 className="font-semibold text-lg leading-tight truncate">{anime.title}</h3>
        <div className="text-sm text-muted-foreground">
          {anime.meta?.genres?.slice(0, 2).join(", ")}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {anime.providers.slice(0, 4).map((p) => (
            <ProviderBadge key={p} name={p} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
