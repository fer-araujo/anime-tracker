"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useWatchlist } from "@/hooks/useWatchlist";
import { AnimeCard } from "@/components/AnimeCard";
import type { Anime, WatchlistStatus } from "@/types/anime";

type Props = {
  anime: Anime;
  onOpen?: (anime: Anime) => void;
};

export function WatchlistAnimeCard({ anime, onOpen }: Props) {
  const { user } = useAuth();

  const {
    entry,
    loading: _loading,
    updateStatus,
    toggleFavorite,
  } = useWatchlist(anime.id.anilist);

  const handleStatusChange = (a: Anime, status: WatchlistStatus) => {
    if (status === entry?.status) return;
    updateStatus(status);
  };

  const handleToggleFavorite = (a: Anime, next: boolean) => {
    toggleFavorite(next);
  };

  if (!user) {
    return (
      <AnimeCard
        anime={anime}
        variant="compact"
        showTitleBelow
        onOpen={onOpen}
      />
    );
  }

  return (
    <AnimeCard
      anime={anime}
      variant="compact"
      showTitleBelow
      onOpen={onOpen}
      watchlistEntry={entry}
      onStatusChange={handleStatusChange}
      onToggleFavorite={handleToggleFavorite}
    />
  );
}
