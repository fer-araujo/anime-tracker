"use client";

import { Modal } from "@/components/custom/Modal";
import { AuthPrompt } from "@/components/common/AuthPrompt";
import { AddToListModal } from "@/components/common/AddToListModal";
import { useResponsiveModalVariant } from "@/hooks/useResponsiveModalVariant";
import type { AnimeEntry } from "@/types/anime";

type Props = {
  isOpen: boolean;
  signedIn: boolean;
  animeId: number;
  currentEntry?: AnimeEntry | null;
  onClose: () => void;
  onLoginNavigate: () => void;
};

/**
 * The dialog every trackable surface opens.
 *
 * Split out alongside `useAnimeTracking` for the same reason: the poster card
 * and the list row show the same two dialogs under the same conditions, and
 * two copies of that pairing would answer differently the first time either is
 * edited.
 */
export function TrackingModal({
  isOpen,
  signedIn,
  animeId,
  currentEntry = null,
  onClose,
  onLoginNavigate,
}: Props) {
  const variant = useResponsiveModalVariant();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant={variant}
      aria-labelledby="tracking-modal-title"
      hideClose
    >
      {!signedIn ? (
        <AuthPrompt onClose={onClose} onLoginNavigate={onLoginNavigate} />
      ) : (
        <AddToListModal
          animeId={animeId}
          currentEntry={currentEntry}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}
