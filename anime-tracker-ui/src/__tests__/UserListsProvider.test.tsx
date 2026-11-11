import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// setup.ts stubs the provider for every other suite; this one tests it.
vi.unmock("@/providers/UserListsProvider");

// One object for every render, as the real provider does between auth events:
// a fresh `user` each time would re-run `refetch` on every state change.
const { user } = vi.hoisted(() => ({ user: { id: "u1" } }));
vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({ user, session: null, loading: false }),
}));

vi.mock("@/lib/fetchAnimeBatch", () => ({
  fetchAnimeBatch: vi.fn(async () => new Map()),
}));

type Result = { data: unknown; error: { message: string } | null };
const { tables } = vi.hoisted(() => ({
  tables: {} as Record<string, Result>,
}));

// `.eq()` resolves on its own for `user_anime` and the dismissals, and offers
// `.order()` for `user_lists` — the three chains the provider builds.
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => {
          const result = Promise.resolve(tables[table]);
          return Object.assign(result, { order: () => result });
        },
      }),
    }),
  }),
}));

import {
  UserListsProvider,
  useUserListsContext,
} from "@/providers/UserListsProvider";
import { fetchAnimeBatch } from "@/lib/fetchAnimeBatch";

function Probe() {
  const { watchingIds, statusByAnimeId, lists, loading, error } =
    useUserListsContext();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="watching">{watchingIds.join(",")}</span>
      <span data-testid="statuses">
        {[...statusByAnimeId].map(([id, s]) => `${id}:${s}`).join(",")}
      </span>
      <span data-testid="lists">{lists.map((l) => l.id).join(",")}</span>
      <span data-testid="error">{error ?? ""}</span>
    </div>
  );
}

function renderProvider() {
  render(
    <UserListsProvider>
      <Probe />
    </UserListsProvider>,
  );
}

describe("UserListsProvider", () => {
  beforeEach(() => {
    // Anime 10 is watched and in no list; anime 20 is listed but only planned.
    tables.user_lists = {
      data: [
        { id: "list-1", name: "Mi colección", color: null, list_entries: [{ anime_id: 20 }] },
      ],
      error: null,
    };
    tables.user_anime = {
      data: [
        { anime_id: 10, status: "watching", favorite: false, score: null },
        { anime_id: 20, status: "plan_to_watch", favorite: false, score: null },
      ],
      error: null,
    };
    tables.user_dismissed_recommendations = { data: [], error: null };
  });

  it("derives watchingIds from user_anime, not from list membership", async () => {
    renderProvider();

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("watching")).toHaveTextContent(/^10$/);
    expect(screen.getByTestId("lists")).toHaveTextContent("list-1");
  });

  it("maps every status, and leaves out an anime that is only favourited", async () => {
    // The calendar is for what the user has placed somewhere. A heart with no
    // status has not been placed anywhere, so it must not switch the icon on.
    tables.user_anime = {
      data: [
        { anime_id: 10, status: "watching", favorite: false, score: null },
        { anime_id: 20, status: "dropped", favorite: false, score: null },
        { anime_id: 30, status: null, favorite: true, score: null },
      ],
      error: null,
    };
    renderProvider();

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("statuses")).toHaveTextContent(/^10:watching,20:dropped$/);
  });

  it("still delivers watchingIds when the user_lists read fails", async () => {
    // The `user_anime` read used to sit behind `user_lists` and was skipped on
    // its failure, so the bell went quiet over an error in an unrelated table.
    tables.user_lists = { data: null, error: { message: "boom" } };
    renderProvider();

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("error")).toHaveTextContent("boom");
    expect(screen.getByTestId("watching")).toHaveTextContent(/^10$/);
  });

  it("publishes watchingIds while the posters are still loading", async () => {
    // The bell reads watchingIds. It used to wait on this batch request, which
    // can run to its 15 s timeout on a cold API, for covers it never shows.
    type Posters = Awaited<ReturnType<typeof fetchAnimeBatch>>;
    let releasePosters: (value: Posters) => void = () => {};
    vi.mocked(fetchAnimeBatch).mockReturnValueOnce(
      new Promise((resolve) => {
        releasePosters = resolve;
      }),
    );
    renderProvider();

    await waitFor(() => expect(screen.getByTestId("watching")).toHaveTextContent(/^10$/));
    expect(screen.getByTestId("statuses")).toHaveTextContent(/^10:watching,20:plan_to_watch$/);
    // Lists wait for their covers, so cards do not flash placeholders first.
    expect(screen.getByTestId("loading")).toHaveTextContent("true");
    expect(screen.getByTestId("lists")).toHaveTextContent(/^$/);

    releasePosters(new Map());
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("lists")).toHaveTextContent("list-1");
  });
});
