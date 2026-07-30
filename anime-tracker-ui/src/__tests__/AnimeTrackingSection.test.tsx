import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({
    user: { id: "u1" },
    session: null,
    loading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock("@/hooks/useAnimeLists", () => ({
  useAnimeLists: () => ({ lists: [] }),
}));

import AnimeTrackingSection from "@/components/AnimeTrackingSection";

describe("AnimeTrackingSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows an error banner when adding a status fails (e.g. rate limited)", async () => {
    const onAddToList = vi
      .fn()
      .mockResolvedValue({ success: false, error: "Too many requests. Try again later." });

    render(
      <AnimeTrackingSection
        animeId={1}
        entry={null}
        loading={false}
        onAddToList={onAddToList}
        onUpdateStatus={vi.fn()}
        onToggleFavorite={vi.fn()}
        onSetScore={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Añadir" }));
    await user.click(screen.getByRole("button", { name: /viendo/i }));

    expect(onAddToList).toHaveBeenCalledWith("watching");
    expect(
      await screen.findByText("Too many requests. Try again later."),
    ).toBeInTheDocument();
  });

  it("does not show an error banner when the action succeeds", async () => {
    const onToggleFavorite = vi.fn().mockResolvedValue({ success: true });

    render(
      <AnimeTrackingSection
        animeId={1}
        entry={null}
        loading={false}
        onAddToList={vi.fn()}
        onUpdateStatus={vi.fn()}
        onToggleFavorite={onToggleFavorite}
        onSetScore={vi.fn()}
        onRemove={vi.fn()}
      />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByTitle(/añadir a favoritos/i));

    await waitFor(() => expect(onToggleFavorite).toHaveBeenCalledWith(true));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows an error banner when removing fails", async () => {
    const onRemove = vi
      .fn()
      .mockResolvedValue({ success: false, error: "DB unavailable" });

    render(
      <AnimeTrackingSection
        animeId={1}
        entry={{ status: "watching", favorite: false, score: null } as any}
        loading={false}
        onAddToList={vi.fn()}
        onUpdateStatus={vi.fn()}
        onToggleFavorite={vi.fn()}
        onSetScore={vi.fn()}
        onRemove={onRemove}
      />,
    );
    const user = userEvent.setup();

    await user.click(screen.getByTitle(/eliminar de mi lista/i));

    expect(await screen.findByText("DB unavailable")).toBeInTheDocument();
  });
});
