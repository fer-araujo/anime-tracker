"use client";

import { AnimeListRow } from "@/components/common/AnimeListRow";
import { TrackingModal } from "@/components/common/TrackingModal";
import { useAnimeTracking } from "@/hooks/useAnimeTracking";
import type { Anime, AnimeEntry } from "@/types/anime";

type Props = {
  anime: Anime;
  onOpen?: (anime: Anime) => void;
  animeEntry?: AnimeEntry | null;
  listCount?: number;
  onTrackingChange?: () => void;
};

/**
 * The list row's counterpart to TrackableAnimeCard.
 *
 * Switching to the list view used to take the controls away: the row could
 * open an anime and nothing else, so favouriting something meant switching
 * back to the grid. The two views now do the same things, through the same
 * hook and the same dialog — the only difference left between them is shape.
 */
export function TrackableAnimeListRow({
  anime,
  onOpen,
  animeEntry = null,
  listCount = 0,
  onTrackingChange,
}: Props) {
  const tracking = useAnimeTracking(anime, onTrackingChange);

  return (
    <>
      <AnimeListRow
        anime={anime}
        onOpen={onOpen}
        animeEntry={animeEntry}
        listCount={listCount}
        onAddToList={tracking.openModal}
        onToggleFavorite={tracking.handleToggleFavorite}
      />

      <TrackingModal
        isOpen={tracking.showModal}
        signedIn={tracking.signedIn}
        animeId={anime.id.anilist}
        currentEntry={animeEntry}
        onClose={tracking.closeModal}
        onLoginNavigate={tracking.goToLogin}
      />
    </>
  );
}
