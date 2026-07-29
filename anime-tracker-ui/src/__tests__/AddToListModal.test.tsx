import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Module mocks (hoisted above imports) ───────────────────────────────────

function resolvedChain<T>(data: T) {
  return {
    then: (onfulfilled: (value: { data: T; error: null }) => unknown) =>
      Promise.resolve({ data, error: null }).then(onfulfilled),
  };
}

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => resolvedChain([])),
      })),
    })),
  })),
}));

vi.mock("@/hooks/useUserLists", () => ({
  useUserLists: vi.fn(),
}));

vi.mock("@/actions/tracking", () => ({
  addToTracking: vi.fn(),
  updateStatus: vi.fn(),
  removeFromTracking: vi.fn(),
}));

vi.mock("@/actions/lists", () => ({
  addToList: vi.fn(),
  removeFromList: vi.fn(),
}));

vi.mock("@/components/lists/CreateListDialog", () => ({
  CreateListDialog: () => null,
}));

import { AddToListModal } from "@/components/common/AddToListModal";
import { useUserLists } from "@/hooks/useUserLists";
import { addToTracking } from "@/actions/tracking";
import { addToList, removeFromList } from "@/actions/lists";

const mockLists = [
  {
    id: "list-1",
    name: "Favoritas de verano",
    color: null,
    anime_count: 0,
    anime_ids: [],
    poster_anime_ids: [],
    poster_urls: [],
  },
];

const mockRefetchLists = vi.fn();

describe("AddToListModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUserLists).mockReturnValue({
      lists: mockLists,
      loading: false,
      refetch: mockRefetchLists,
    });
  });

  it("clicking a list only updates local selection — does not persist immediately", async () => {
    render(<AddToListModal animeId={1} currentEntry={null} onClose={vi.fn()} />);
    const user = userEvent.setup();

    const listButton = await screen.findByText("Favoritas de verano");
    await user.click(listButton);

    expect(addToList).not.toHaveBeenCalled();
    expect(removeFromList).not.toHaveBeenCalled();
  });

  it("keeps the confirm button disabled without a status, even with a list selected", async () => {
    render(<AddToListModal animeId={1} currentEntry={null} onClose={vi.fn()} />);
    const user = userEvent.setup();

    const listButton = await screen.findByText("Favoritas de verano");
    await user.click(listButton);

    const confirmButton = screen.getByRole("button", {
      name: /añadir a mi lista/i,
    });
    expect(confirmButton).toBeDisabled();
    expect(addToList).not.toHaveBeenCalled();
  });

  it("flushes status + list diff together on confirm, then refetches and closes", async () => {
    vi.mocked(addToTracking).mockResolvedValue({ success: true });
    vi.mocked(addToList).mockResolvedValue({ success: true });

    const onClose = vi.fn();
    render(<AddToListModal animeId={1} currentEntry={null} onClose={onClose} />);
    const user = userEvent.setup();

    const listButton = await screen.findByText("Favoritas de verano");
    await user.click(listButton);
    await user.click(screen.getByRole("radio", { name: /plan para ver/i }));

    const confirmButton = screen.getByRole("button", {
      name: /añadir a mi lista/i,
    });
    expect(confirmButton).not.toBeDisabled();
    await user.click(confirmButton);

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(addToTracking).toHaveBeenCalledWith(1, "plan_to_watch");
    expect(addToList).toHaveBeenCalledWith("list-1", 1);
    expect(mockRefetchLists).toHaveBeenCalled();
  });

  it("cancel does not write status or list changes", async () => {
    const onClose = vi.fn();
    render(<AddToListModal animeId={1} currentEntry={null} onClose={onClose} />);
    const user = userEvent.setup();

    const listButton = await screen.findByText("Favoritas de verano");
    await user.click(listButton);
    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(addToList).not.toHaveBeenCalled();
    expect(addToTracking).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
