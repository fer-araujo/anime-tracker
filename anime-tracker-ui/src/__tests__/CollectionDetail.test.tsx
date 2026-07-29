import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Module mocks (hoisted above imports) ───────────────────────────────────

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: { id: "u1" },
    session: null,
    loading: false,
    signOut: vi.fn(),
  }),
}));

function makeAnime(id: number, title: string) {
  return {
    id: { anilist: id, tmdb: null },
    title,
    providers: [],
    images: { poster: null },
  };
}

vi.mock("@/lib/fetchAnimeBatch", () => ({
  fetchAnimeBatch: vi.fn(async (ids: number[]) => {
    const map = new Map();
    for (const id of ids) {
      map.set(id, {
        title: `Anime #${id}`,
        poster: null,
        backdrop: null,
        anime: makeAnime(id, `Anime #${id}`),
      });
    }
    return map;
  }),
}));

vi.mock("@/hooks/useBatchAnimeEntries", () => ({
  useBatchAnimeEntries: () => ({
    entriesMap: new Map([[1, { status: "watching", favorite: false }]]),
  }),
}));

const mockRefetchLists = vi.fn();
vi.mock("@/hooks/useUserLists", () => ({
  useUserLists: () => ({
    lists: [
      {
        id: "list-1",
        name: "Mi colección",
        color: null,
        anime_count: 1,
        anime_ids: [1],
        poster_anime_ids: [],
        poster_urls: [],
      },
    ],
    loading: false,
    refetch: mockRefetchLists,
  }),
}));

vi.mock("@/hooks/useResponsiveModalVariant", () => ({
  useResponsiveModalVariant: () => "center",
}));

vi.mock("@/actions/tracking", () => ({
  toggleFavorite: vi.fn(),
}));

vi.mock("@/components/AnimeCard", () => ({
  AnimeCard: ({ anime, animeEntry, listCount, onAddToList }: any) => (
    <div data-testid={`card-${anime.id.anilist}`}>
      <span data-testid={`listcount-${anime.id.anilist}`}>{listCount}</span>
      <span data-testid={`status-${anime.id.anilist}`}>
        {animeEntry?.status ?? "none"}
      </span>
      <button onClick={() => onAddToList(anime)}>
        trigger-add-{anime.id.anilist}
      </button>
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
  AddToListModal: ({ onClose, onListsChanged }: any) => (
    <div>
      <button onClick={() => onListsChanged({ added: [], removed: ["list-1"] })}>
        remove-from-this-list
      </button>
      <button onClick={onClose}>close-modal</button>
    </div>
  ),
}));

import { CollectionDetail } from "@/components/lists/CollectionDetail";

describe("CollectionDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes animeEntry and listCount down to AnimeCard", async () => {
    render(
      <CollectionDetail listId="list-1" listName="Mi colección" animeIds={[1, 2]} />,
    );

    expect(await screen.findByTestId("card-1")).toBeInTheDocument();
    expect(screen.getByTestId("listcount-1")).toHaveTextContent("1");
    expect(screen.getByTestId("status-1")).toHaveTextContent("watching");
    expect(screen.getByTestId("listcount-2")).toHaveTextContent("0");
  });

  it("removes the anime locally when this list is unchecked in the modal", async () => {
    render(
      <CollectionDetail listId="list-1" listName="Mi colección" animeIds={[1, 2]} />,
    );
    const user = userEvent.setup();

    await screen.findByTestId("card-1");
    await user.click(screen.getByText("trigger-add-1"));
    await user.click(await screen.findByText("remove-from-this-list"));

    await waitFor(() =>
      expect(screen.queryByTestId("card-1")).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId("card-2")).toBeInTheDocument();
    expect(mockRefetchLists).toHaveBeenCalled();
  });

  it("keeps the anime visible when the modal closes without a list change", async () => {
    render(
      <CollectionDetail listId="list-1" listName="Mi colección" animeIds={[1]} />,
    );
    const user = userEvent.setup();

    await screen.findByTestId("card-1");
    await user.click(screen.getByText("trigger-add-1"));
    await user.click(await screen.findByText("close-modal"));

    expect(screen.getByTestId("card-1")).toBeInTheDocument();
    expect(mockRefetchLists).not.toHaveBeenCalled();
  });
});
