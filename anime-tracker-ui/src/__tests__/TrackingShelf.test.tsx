import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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

const mockRefetchEntries = vi.fn();
vi.mock("@/hooks/useBatchAnimeEntries", () => ({
  useBatchAnimeEntries: () => ({
    entriesMap: new Map(),
    refetch: mockRefetchEntries,
  }),
}));

vi.mock("@/hooks/useResponsiveModalVariant", () => ({
  useResponsiveModalVariant: () => "center",
}));

vi.mock("@/actions/tracking", () => ({
  toggleFavorite: vi.fn(),
}));

vi.mock("@/components/AnimeCard", () => ({
  AnimeCard: ({ anime, onAddToList }: any) => (
    <button onClick={() => onAddToList(anime)}>
      trigger-add-{anime.id.anilist}
    </button>
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

const mockRefetchLists = vi.fn();
vi.mock("@/hooks/useUserLists", () => ({
  useUserLists: () => ({ lists: [], loading: false, refetch: mockRefetchLists }),
}));

import { TrackingShelf } from "@/components/common/TrackingShelf";

const anime = { id: { anilist: 1 } } as any;

describe("TrackingShelf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refetches the user's lists after closing the add-to-list modal", async () => {
    render(<TrackingShelf title="Test" items={[anime]} />);
    const user = userEvent.setup();

    await user.click(screen.getByText(/trigger-add-1/i));
    await user.click(await screen.findByText(/close-modal/i));

    expect(mockRefetchLists).toHaveBeenCalled();
    expect(mockRefetchEntries).toHaveBeenCalled();
  });
});
