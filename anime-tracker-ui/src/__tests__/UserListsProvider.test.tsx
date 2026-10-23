import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// setup.ts stubs the provider for every other suite; this one tests it.
vi.unmock("@/providers/UserListsProvider");

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "u1" }, session: null, loading: false }),
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

function Probe() {
  const { watchingIds, lists, loading, error } = useUserListsContext();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="watching">{watchingIds.join(",")}</span>
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

  it("still delivers watchingIds when the user_lists read fails", async () => {
    // The `user_anime` read used to sit behind `user_lists` and was skipped on
    // its failure, so the bell went quiet over an error in an unrelated table.
    tables.user_lists = { data: null, error: { message: "boom" } };
    renderProvider();

    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("error")).toHaveTextContent("boom");
    expect(screen.getByTestId("watching")).toHaveTextContent(/^10$/);
  });
});
