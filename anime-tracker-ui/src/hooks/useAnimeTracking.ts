"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { toggleFavorite as toggleFavoriteAction } from "@/actions/tracking";
import type { Anime } from "@/types/anime";

/**
 * The tracking behaviour shared by every surface that lets you act on an anime.
 *
 * This lived inside TrackableAnimeCard, which was fine while the poster card
 * was the only thing you could act on. The list row needs the same modal, the
 * same auth prompt and the same optimistic favourite, and a second copy of that
 * would drift from the first the moment either is touched.
 */
export function useAnimeTracking(anime: Anime, onTrackingChange?: () => void) {
  const { user } = useAuth();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  /**
   * A signed-out user gets the prompt once per session.
   *
   * Storage throws in private mode, and a prompt is not worth failing a click
   * over — so the read is guarded and its failure means "show it".
   */
  const promptSeen = useCallback(() => {
    try {
      return Boolean(sessionStorage.getItem("auth_prompt_seen"));
    } catch {
      return false;
    }
  }, []);

  const openModal = useCallback(() => {
    if (!user && promptSeen()) return;
    setShowModal(true);
  }, [user, promptSeen]);

  const handleToggleFavorite = useCallback(
    (_anime: Anime, next: boolean) => {
      if (!user) {
        if (promptSeen()) return;
        setShowModal(true);
        return;
      }
      // The card has already flipped its own optimistic state, so this only
      // has to persist.
      toggleFavoriteAction(anime.id.anilist, next);
    },
    [user, anime.id.anilist, promptSeen],
  );

  const closeModal = useCallback(() => {
    setShowModal(false);
    onTrackingChange?.();
  }, [onTrackingChange]);

  const goToLogin = useCallback(() => router.push("/login"), [router]);

  return {
    signedIn: Boolean(user),
    showModal,
    openModal,
    closeModal,
    goToLogin,
    handleToggleFavorite,
  };
}
