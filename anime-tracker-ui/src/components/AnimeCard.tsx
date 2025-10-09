import Image from "next/image";
import { ProviderBadge } from "./ProviderBadge";
import { Card, CardContent } from "@/components/ui/card";
import { uniqueNormalizedProviders } from "@/lib/providers";

type Anime = {
  id: { anilist: number; tmdb: number | null };
  title: string;
  poster: string | null;
  providers: string[];
  meta?: { genres?: string[]; rating?: number | null };
};

export function AnimeCard({ anime }: { anime: Anime }) {
  const normalized = uniqueNormalizedProviders(anime.providers);
  return (
    <Card className="bg-card border-neutral-800 gap-0.5 overflow-hidden p-0 rounded-2xl shadow-soft">
      <div className="relative w-full h-[22rem] bg-muted flex items-center justify-center overflow-hidden">
        {anime.poster ? (
          <Image
            src={anime.poster}
            alt={anime.title}
            fill
            className="transition-all duration-300 hover:scale-105"
            sizes="(max-width:768px) 100vw, 33vw"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-muted-foreground text-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-10 h-10 mb-2 opacity-40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M4 4h16v16H4z" />
              <path d="m4 15 4-4 4 4 4-4 4 4" />
            </svg>
            Sin imagen
          </div>
        )}
      </div>

      <CardContent className="p-3">
        <h3 className="font-semibold text-lg leading-tight truncate">
          {anime.title}
        </h3>
        <div className="text-sm text-muted-foreground">
          {anime.meta?.genres?.slice(0, 2).join(", ")}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {normalized.length > 0 ? (
            normalized.map((lbl) => <ProviderBadge key={lbl} label={lbl} />)
          ) : (
            <ProviderBadge label="Pirata" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
