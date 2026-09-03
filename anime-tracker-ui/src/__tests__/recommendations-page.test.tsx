import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { Anime } from "@/types/anime";
import type { RecommendationLibrary } from "@/types/recommendations";
import { seedsMissing, MIN_SEEDS } from "@/lib/recommendations";
import { UNDO_WINDOW_MS } from "@/hooks/useDismissals";

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: mockReplace, prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockAuth = vi.fn();
vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => mockAuth(),
}));

const mockLists = vi.fn();
vi.mock("@/hooks/useUserLists", () => ({
  useUserLists: () => mockLists(),
}));

const mockDismiss = vi.fn().mockResolvedValue({ success: true });
const mockUndo = vi.fn().mockResolvedValue({ success: true });
vi.mock("@/actions/dismissRecommendation", () => ({
  dismissRecommendation: (...a: unknown[]) => mockDismiss(...a),
  undoDismissRecommendation: (...a: unknown[]) => mockUndo(...a),
}));

vi.mock("@/hooks/useBatchAnimeEntries", () => ({
  useBatchAnimeEntries: () => ({ entriesMap: new Map(), refetch: vi.fn() }),
}));

vi.mock("@/components/season/TrackableAnimeCard", () => ({
  TrackableAnimeCard: ({ anime }: { anime: Anime }) => (
    <div data-testid="card">{anime.title}</div>
  ),
}));

const mockFetch = vi.fn();
vi.mock("@/lib/recommendations", async () => {
  const actual = await vi.importActual<typeof import("@/lib/recommendations")>(
    "@/lib/recommendations",
  );
  return { ...actual, fetchRecommendations: (...a: unknown[]) => mockFetch(...a) };
});

import { RecommendationsPage } from "@/components/recommendations/RecommendationsPage";

const anime = (id: number, title: string): Anime => ({
  id: { anilist: id, tmdb: null },
  title,
  providers: [],
  images: { poster: null },
  meta: {},
});

const library = (seedCount: number): RecommendationLibrary => ({
  seeds: Array.from({ length: seedCount }, (_, i) => ({
    animeId: i + 1,
    favorite: true,
    score: null,
  })),
  excludedIds: [],
  completedIds: [],
});

const setup = (opts: {
  user?: boolean;
  seeds?: number;
  loading?: boolean;
}) => {
  mockAuth.mockReturnValue({
    user: opts.user === false ? null : { id: "u1" },
    loading: false,
  });
  mockLists.mockReturnValue({
    library: library(opts.seeds ?? 3),
    loading: opts.loading ?? false,
    lists: [],
    error: null,
    refetch: vi.fn(),
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({
    meta: { seedCount: 3, minSeeds: 3, enough: true },
    data: [anime(10, "Frieren"), anime(11, "Vinland Saga")],
    reserve: [anime(12, "Monster")],
  });
});

describe("seedsMissing", () => {
  it("counts down to the threshold and stops at zero", () => {
    expect(seedsMissing(0)).toBe(MIN_SEEDS);
    expect(seedsMissing(2)).toBe(1);
    expect(seedsMissing(3)).toBe(0);
    expect(seedsMissing(50)).toBe(0);
  });
});

describe("RecommendationsPage", () => {
  it("asks a signed-out visitor to sign in instead of erroring", async () => {
    setup({ user: false });
    render(<RecommendationsPage />);

    expect(await screen.findByText(/Inicia sesión/)).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("says how many anime are still missing, not just 'mark some'", async () => {
    // A threshold you cannot see is one you cannot deliberately cross.
    setup({ seeds: 2 });
    render(<RecommendationsPage />);

    expect(await screen.findByText(/falta 1 anime/i)).toBeInTheDocument();
    expect(screen.getByText(/Llevas 2/)).toBeInTheDocument();
  });

  it("phrases the zero case without a countdown", async () => {
    setup({ seeds: 0 });
    render(<RecommendationsPage />);

    expect(await screen.findByText(/Aún no sabemos qué te gusta/)).toBeInTheDocument();
    expect(screen.getByText(/Marca 3 animes/)).toBeInTheDocument();
  });

  it("does not call the API below the threshold", async () => {
    setup({ seeds: 1 });
    render(<RecommendationsPage />);

    await screen.findByText(/faltan 2/i);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("renders recommendations once the threshold is met", async () => {
    setup({ seeds: 3 });
    render(<RecommendationsPage />);

    expect(await screen.findByText("Frieren")).toBeInTheDocument();
    expect(screen.getByText("Vinland Saga")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("explains an empty result rather than showing a blank grid", async () => {
    // Enough seeds and nothing back means the user already tracks everything
    // the community associates with their taste. Saying so beats silence.
    setup({ seeds: 5 });
    mockFetch.mockResolvedValue({
      meta: { seedCount: 5, minSeeds: 3, enough: true },
      data: [],
    });
    render(<RecommendationsPage />);

    expect(await screen.findByText(/Nada nuevo por ahora/)).toBeInTheDocument();
  });

  it("surfaces a failed request as a message, not an empty page", async () => {
    setup({ seeds: 3 });
    mockFetch.mockRejectedValue(new Error("boom"));
    render(<RecommendationsPage />);

    expect(
      await screen.findByText(/No se pudieron cargar las recomendaciones/),
    ).toBeInTheDocument();
  });

  it("writes the dismissal immediately, not when the undo window closes", async () => {
    // Dismissing is usually the last thing someone does before leaving the
    // page. Waiting for the timer would lose exactly those.
    setup({ seeds: 3 });
    render(<RecommendationsPage />);
    await screen.findByText("Frieren");

    screen.getByRole("button", { name: /No me interesa Frieren/ }).click();

    await waitFor(() => expect(mockDismiss).toHaveBeenCalledWith(10));
  });

  it("leaves an undo in the card's own slot", async () => {
    // In place rather than as a toast: the slot is where the user was looking,
    // and a message at the edge of the screen asks them to find it again.
    setup({ seeds: 3 });
    render(<RecommendationsPage />);
    await screen.findByText("Frieren");

    screen.getByRole("button", { name: /No me interesa Frieren/ }).click();

    expect(await screen.findByText("Deshacer")).toBeInTheDocument();
    expect(screen.getByText(/Ocultamos/)).toBeInTheDocument();
    // Still in the list — the row has not been reclaimed yet.
    expect(screen.getByText("Vinland Saga")).toBeInTheDocument();
  });

  it("deletes the row again when undone", async () => {
    setup({ seeds: 3 });
    render(<RecommendationsPage />);
    await screen.findByText("Frieren");

    screen.getByRole("button", { name: /No me interesa Frieren/ }).click();
    (await screen.findByText("Deshacer")).click();

    await waitFor(() => expect(mockUndo).toHaveBeenCalledWith(10));
    // And the card comes back rather than the slot staying empty.
    await waitFor(() => expect(screen.getByText("Frieren")).toBeInTheDocument());
  });

  it("promotes a reserve pick once the window closes", async () => {
    // There is no paginator, so dismissing is what advances the page. The
    // replacement travels in the same response — no second request.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setup({ seeds: 3 });
    render(<RecommendationsPage />);
    await screen.findByText("Frieren");

    screen.getByRole("button", { name: /No me interesa Frieren/ }).click();
    await screen.findByText("Deshacer");

    await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS + 100);

    await waitFor(() => expect(screen.getByText("Monster")).toBeInTheDocument());
    expect(screen.queryByText("Frieren")).toBeNull();
    vi.useRealTimers();
  });

  it("offers the view toggle only when there is something to switch", async () => {
    setup({ seeds: 2 });
    render(<RecommendationsPage />);
    await screen.findByText(/falta 1 anime/i);
    expect(screen.queryByRole("group", { name: "Modo de vista" })).toBeNull();

    setup({ seeds: 3 });
    render(<RecommendationsPage />);
    await screen.findByText("Frieren");
    await waitFor(() =>
      expect(
        screen.getByRole("group", { name: "Modo de vista" }),
      ).toBeInTheDocument(),
    );
  });
});
