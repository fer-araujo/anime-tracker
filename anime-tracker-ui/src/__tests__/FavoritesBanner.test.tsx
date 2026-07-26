import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Module mocks (hoisted above imports) ───────────────────────────────────

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: vi.fn(() => ({
    user: null,
    session: null,
    loading: false,
    signOut: vi.fn(),
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

import { FavoritesBanner } from "@/components/lists/FavoritesBanner";
import { useAuth } from "@/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// ── Helpers ────────────────────────────────────────────────────────────────

/** Creates a thenable that resolves with { data } — mimics Supabase Postgrest */
function resolvedChain<T>(data: T) {
  return {
    then: (
      onfulfilled: (value: { data: T }) => unknown,
    ) => Promise.resolve({ data }).then(onfulfilled),
  };
}

/** Creates a thenable that never resolves — keeps loading state active */
function pendingChain() {
  return new Promise<never>(() => {});
}

const mockUser = { id: "test-user-id" };

// ── Tests ──────────────────────────────────────────────────────────────────

describe("FavoritesBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading skeleton initially", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser as any,
      session: null,
      loading: false,
      signOut: vi.fn(),
    });

    vi.mocked(createClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => pendingChain()),
          })),
        })),
      })),
    } as any);

    const { container } = render(<FavoritesBanner />);

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows empty state with CTA button when no favorites", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser as any,
      session: null,
      loading: false,
      signOut: vi.fn(),
    });

    vi.mocked(createClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => resolvedChain([])),
          })),
        })),
      })),
    } as any);

    render(<FavoritesBanner />);

    expect(
      await screen.findByText(/añade animes a favoritos/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /explorar temporada/i }),
    ).toBeInTheDocument();
  });

  it("the CTA button links to /season", async () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    });

    vi.mocked(useAuth).mockReturnValue({
      user: mockUser as any,
      session: null,
      loading: false,
      signOut: vi.fn(),
    });

    vi.mocked(createClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => resolvedChain([])),
          })),
        })),
      })),
    } as any);

    render(<FavoritesBanner />);

    const btn = await screen.findByRole("button", {
      name: /explorar temporada/i,
    });
    const user = userEvent.setup();
    await user.click(btn);

    expect(mockPush).toHaveBeenCalledWith("/season");
  });

  it("shows banner with count when favorites exist", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser as any,
      session: null,
      loading: false,
      signOut: vi.fn(),
    });

    const favorites = [{ anime_id: 1 }, { anime_id: 2 }, { anime_id: 3 }];

    vi.mocked(createClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => resolvedChain(favorites)),
          })),
        })),
      })),
    } as any);

    render(<FavoritesBanner />);

    expect(await screen.findByText("Favoritos")).toBeInTheDocument();
    expect(screen.getByText("3 series guardadas")).toBeInTheDocument();
  });
});
