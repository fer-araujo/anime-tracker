import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "u1" }, session: null, loading: false, signOut: vi.fn() }),
}));

vi.mock("@/hooks/useResponsiveModalVariant", () => ({
  useResponsiveModalVariant: () => "center",
}));

const mockToggleFavorite = vi.fn();
vi.mock("@/actions/tracking", () => ({
  toggleFavorite: (...args: unknown[]) => mockToggleFavorite(...args),
}));

// The point of the refactor: this component must NOT fetch its own entry.
const mockUseAnimeEntry = vi.fn();
vi.mock("@/hooks/useAnimeEntry", () => ({
  useAnimeEntry: mockUseAnimeEntry,
}));

vi.mock("@/components/AnimeCard", () => ({
  AnimeCard: ({ animeEntry, listCount, onAddToList, onToggleFavorite, anime }: any) => (
    <div>
      <span data-testid="listcount">{listCount}</span>
      <span data-testid="status">{animeEntry?.status ?? "none"}</span>
      <button onClick={() => onAddToList(anime)}>open-modal</button>
      <button onClick={() => onToggleFavorite(anime, true)}>fav</button>
    </div>
  ),
}));

vi.mock("@/components/custom/Modal", () => ({
  Modal: ({ isOpen, children }: any) => (isOpen ? <div>{children}</div> : null),
}));

vi.mock("@/components/common/AuthPrompt", () => ({
  AuthPrompt: () => <div>auth-prompt</div>,
}));

vi.mock("@/components/common/AddToListModal", () => ({
  AddToListModal: ({ onClose }: any) => (
    <button onClick={onClose}>close-modal</button>
  ),
}));

import { TrackableAnimeCard } from "@/components/season/TrackableAnimeCard";

const anime = { id: { anilist: 7 }, title: "Test", providers: [], images: { poster: null } } as any;

describe("TrackableAnimeCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the tracking state handed down by the parent", () => {
    render(
      <TrackableAnimeCard
        anime={anime}
        animeEntry={{ status: "watching", favorite: false, score: null } as any}
        listCount={3}
      />,
    );

    expect(screen.getByTestId("status")).toHaveTextContent("watching");
    expect(screen.getByTestId("listcount")).toHaveTextContent("3");
  });

  it("does not fetch its own entry — the parent batches that query", () => {
    // Regression guard: reinstating useAnimeEntry here would restore the
    // one-query-per-card behaviour (up to 100 on a full season page).
    render(<TrackableAnimeCard anime={anime} />);
    expect(mockUseAnimeEntry).not.toHaveBeenCalled();
  });

  it("asks the parent to refresh after the modal closes", async () => {
    const onTrackingChange = vi.fn();
    render(
      <TrackableAnimeCard anime={anime} onTrackingChange={onTrackingChange} />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByText("open-modal"));
    await user.click(await screen.findByText("close-modal"));

    expect(onTrackingChange).toHaveBeenCalled();
  });

  it("persists a favourite toggle for a signed-in user", async () => {
    render(<TrackableAnimeCard anime={anime} />);
    const user = userEvent.setup();

    await user.click(screen.getByText("fav"));

    expect(mockToggleFavorite).toHaveBeenCalledWith(7, true);
  });
});
