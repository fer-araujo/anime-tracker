import { StrictMode } from "react";
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

// Anime 1 carries providers, anime 2 does not — the batch endpoint used to
// hardcode `providers: []` for every entry, so this fixture is what tells the
// two cases apart at all.
const PROVIDERS_BY_ID: Record<number, string[]> = { 1: ["Netflix"] };

function makeAnime(id: number, title: string) {
  return {
    id: { anilist: id, tmdb: null },
    title,
    providers: PROVIDERS_BY_ID[id] ?? [],
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
    entriesMap: new Map([
      [1, { status: "watching", favorite: false, score: 8 }],
    ]),
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
      <span data-testid={`providers-${anime.id.anilist}`}>
        {anime.providers?.length ? anime.providers.join(",") : "Pirata"}
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

// Reduced to what the collection asks of it: the total, and a way to turn the
// page. The real control's page-size select is its own component's concern.
vi.mock("@/components/custom/Pagination", () => ({
  Pagination: ({ totalItems, currentPage, onPageChange }: any) => (
    <div data-testid="pagination">
      <span data-testid="pagination-total">{totalItems}</span>
      <button onClick={() => onPageChange(currentPage + 1)}>next-page</button>
    </div>
  ),
}));

import { CollectionDetail } from "@/components/lists/CollectionDetail";
import { fetchAnimeBatch } from "@/lib/fetchAnimeBatch";

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

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

  it("renders the real providers the batch returned instead of 'Pirata'", async () => {
    // The batch endpoint hardcoded `providers: []`, so every card in a
    // collection claimed no legal stream existed — including for anime that
    // were streaming. This pins the data path: whatever the batch resolves has
    // to survive all the way to the card.
    render(
      <CollectionDetail listId="list-1" listName="Mi colección" animeIds={[1, 2]} />,
    );

    expect(await screen.findByTestId("providers-1")).toHaveTextContent(
      "Netflix",
    );
    // Anime 2 genuinely has none, so the fallback label is still correct there.
    expect(screen.getByTestId("providers-2")).toHaveTextContent("Pirata");
  });

  it("shows the anime count and average score derived from entriesMap", async () => {
    render(
      <CollectionDetail listId="list-1" listName="Mi colección" animeIds={[1, 2]} />,
    );

    await screen.findByTestId("card-1");
    expect(screen.getByText("2 animes")).toBeInTheDocument();
    expect(screen.getByText("8.0 promedio")).toBeInTheDocument();
  });

  it("updates the count and drops the average once the scored anime is removed", async () => {
    render(
      <CollectionDetail listId="list-1" listName="Mi colección" animeIds={[1, 2]} />,
    );
    const user = userEvent.setup();

    await screen.findByTestId("card-1");
    await user.click(screen.getByText("trigger-add-1"));
    await user.click(await screen.findByText("remove-from-this-list"));

    await waitFor(() => expect(screen.getByText("1 anime")).toBeInTheDocument());
    expect(screen.queryByText(/promedio/)).not.toBeInTheDocument();
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

  it("fetches only the visible page, so a large collection stays under the batch cap", async () => {
    // The whole collection used to go out in one request. The endpoint rejects
    // more than fifty ids, so any list that grew past that showed an error.
    render(
      <CollectionDetail listId="list-1" listName="Mi colección" animeIds={range(60)} />,
    );

    await screen.findByTestId("card-1");
    const requested = vi.mocked(fetchAnimeBatch).mock.calls.flatMap((c) => c[0]);
    expect(requested).toHaveLength(20);
    expect(screen.queryByTestId("card-21")).not.toBeInTheDocument();
    // The count is the collection's, not the page's.
    expect(screen.getByText("60 animes")).toBeInTheDocument();
    expect(screen.getByTestId("pagination-total")).toHaveTextContent("60");
  });

  it("loads the next page's anime when the page turns", async () => {
    render(
      <CollectionDetail listId="list-1" listName="Mi colección" animeIds={range(25)} />,
    );
    const user = userEvent.setup();

    await screen.findByTestId("card-1");
    await user.click(screen.getByText("next-page"));

    expect(await screen.findByTestId("card-21")).toBeInTheDocument();
    // Waited for, not asserted at once: AnimatePresence keeps the outgoing page
    // mounted for its exit animation, the same reason the removal test waits.
    await waitFor(() =>
      expect(screen.queryByTestId("card-1")).not.toBeInTheDocument(),
    );
  });

  it("finishes loading under StrictMode", async () => {
    // Development runs every effect twice. A cancel flag discarded the first
    // fetch while the second found every id already marked as requested, and
    // the page sat on its skeleton forever.
    render(
      <StrictMode>
        <CollectionDetail listId="list-1" listName="Mi colección" animeIds={[1, 2]} />
      </StrictMode>,
    );

    expect(await screen.findByTestId("card-1")).toBeInTheDocument();
  });

  it("shows no paginator for a collection that fits on one page", async () => {
    // A control offering a single page to click is noise.
    render(
      <CollectionDetail listId="list-1" listName="Mi colección" animeIds={[1, 2]} />,
    );

    await screen.findByTestId("card-1");
    expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();
  });
});
