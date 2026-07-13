import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Anime } from "@/types/anime";
import GridSkeleton from "@/components/Loaders/GridSkeleton";
import {
  filterBySearch,
  filterByGenre,
  sortAnime,
} from "@/components/season/Season";
import SeasonPage from "@/components/season/Season";

/* -------------------------------------------------------------------------- */
/*  Fixtures                                                                  */
/* -------------------------------------------------------------------------- */

const makeAnime = (
  id: number,
  title: string,
  overrides?: Partial<Anime>,
): Anime => ({
  id: { anilist: id, tmdb: null },
  title,
  providers: [],
  images: { poster: null },
  ...overrides,
  meta: {
    genres: [],
    rating: null,
    popularity: null,
    ...overrides?.meta,
  },
});

const FIXTURES: Anime[] = [
  makeAnime(1, "Attack on Titan", {
    meta: { genres: ["Action", "Drama"], rating: 9.0, popularity: 95 },
  }),
  makeAnime(2, "Dragon Ball Z", {
    meta: { genres: ["Action", "Adventure"], rating: 8.5, popularity: 90 },
  }),
  makeAnime(3, "Naruto", {
    meta: { genres: ["Action", "Adventure"], rating: 8.0, popularity: 88 },
  }),
  makeAnime(4, "Death Note", {
    meta: { genres: ["Thriller", "Supernatural"], rating: 9.5, popularity: 85 },
  }),
  makeAnime(5, "One Piece", {
    meta: {
      genres: ["Action", "Adventure", "Comedy"],
      rating: 9.2,
      popularity: 97,
    },
  }),
];

/* -------------------------------------------------------------------------- */
/*  Tests                                                                     */
/* -------------------------------------------------------------------------- */

describe("filterBySearch", () => {
  it("returns all anime when query is empty", () => {
    expect(filterBySearch(FIXTURES, "")).toHaveLength(FIXTURES.length);
  });

  it("filters by title case-insensitively", () => {
    const result = filterBySearch(FIXTURES, "attack");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Attack on Titan");
  });

  it("returns empty array when no match", () => {
    expect(filterBySearch(FIXTURES, "xyznonexistent")).toHaveLength(0);
  });

  it("is case-insensitive", () => {
    const result = filterBySearch(FIXTURES, "DRAGON");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Dragon Ball Z");
  });

  it("returns all when query is whitespace", () => {
    expect(filterBySearch(FIXTURES, "   ")).toHaveLength(FIXTURES.length);
  });
});

describe("filterByGenre", () => {
  it("returns all when no genres selected", () => {
    expect(filterByGenre(FIXTURES, new Set())).toHaveLength(FIXTURES.length);
  });

  it("filters by a single genre", () => {
    const result = filterByGenre(FIXTURES, new Set(["Thriller"]));
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Death Note");
  });

  it("uses OR logic for multiple genres", () => {
    const result = filterByGenre(FIXTURES, new Set(["Thriller", "Comedy"]));
    expect(result).toHaveLength(2);
    const titles = result.map((a) => a.title).sort();
    expect(titles).toEqual(["Death Note", "One Piece"]);
  });

  it("returns empty when no anime match", () => {
    expect(filterByGenre(FIXTURES, new Set(["Horror"]))).toHaveLength(0);
  });
});

describe("sortAnime", () => {
  it("sorts by rating descending", () => {
    const result = sortAnime(FIXTURES, "rating");
    expect(result[0].title).toBe("Death Note");
    expect(result[result.length - 1].title).toBe("Naruto");
  });

  it("sorts by popularity descending", () => {
    const result = sortAnime(FIXTURES, "popularity");
    expect(result[0].title).toBe("One Piece");
    expect(result[result.length - 1].title).toBe("Death Note");
  });

  it("sorts by title alphabetically", () => {
    const result = sortAnime(FIXTURES, "title");
    const titles = result.map((a) => a.title);
    expect(titles).toEqual([
      "Attack on Titan",
      "Death Note",
      "Dragon Ball Z",
      "Naruto",
      "One Piece",
    ]);
  });

  it("puts null ratings last when sorting by rating", () => {
    const withNulls = [
      ...FIXTURES,
      makeAnime(99, "No Rating", { meta: { rating: null, popularity: 50 } }),
    ];
    const result = sortAnime(withNulls, "rating");
    expect(result[result.length - 1].title).toBe("No Rating");
  });

  it("puts null popularity last when sorting by popularity", () => {
    const withNulls = [
      ...FIXTURES,
      makeAnime(99, "No Pop", { meta: { rating: 5, popularity: null } }),
    ];
    const result = sortAnime(withNulls, "popularity");
    expect(result[result.length - 1].title).toBe("No Pop");
  });
});

/* -------------------------------------------------------------------------- */
/*  GridSkeleton grid variant tests                                           */
/* -------------------------------------------------------------------------- */

describe("GridSkeleton grid variant", () => {
  it("renders grid classes when variant='grid'", () => {
    const { container } = render(<GridSkeleton variant="grid" count={5} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("grid");
    expect(wrapper.className).toContain("grid-cols-2");
    expect(wrapper.className).toContain("md:grid-cols-3");
    expect(wrapper.className).toContain("lg:grid-cols-5");
  });

  it("renders aspect-[3/4] cards in grid mode", () => {
    const { container } = render(<GridSkeleton variant="grid" count={3} />);
    const cards = container.querySelectorAll(".aspect-\\[3\\/4\\]");
    expect(cards.length).toBe(3);
  });

  it("renders flex layout when variant='shelf' (default)", () => {
    const { container } = render(<GridSkeleton count={3} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("flex");
    expect(wrapper.className).not.toContain("grid");
  });
});

/* -------------------------------------------------------------------------- */
/*  SeasonPage integration tests                                        */
/* -------------------------------------------------------------------------- */

describe("SeasonPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state on mount", () => {
    // Don't resolve the fetch — keep loading
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise(() => {}),
    );

    const { container } = render(<SeasonPage />);
    // Should show GridSkeleton grid variant
    const skeleton = container.querySelector(".grid");
    expect(skeleton).toBeTruthy();
    expect(skeleton?.className).toContain("grid-cols-2");
  });

  it("shows error state with retry button", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

    render(<SeasonPage />);

    await waitFor(() => {
      expect(screen.getByText("Could not load season data")).toBeTruthy();
    });

    expect(screen.getByText("Retry")).toBeTruthy();
  });

  it("shows empty API state when backend returns no data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          meta: {
            country: "MX",
            season: "SUMMER",
            year: 2026,
            total: 0,
            source: "test",
          },
          data: [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(<SeasonPage />);

    await waitFor(() => {
      expect(
        screen.getByText("No anime available for this season"),
      ).toBeTruthy();
    });
  });

  it("calls fetch with year/season URL params when props provided", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          meta: {
            country: "MX",
            season: "FALL",
            year: 2025,
            total: 0,
            source: "test",
          },
          data: [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    render(<SeasonPage year="2025" season="FALL" />);

    await waitFor(() => {
      // The fetch URL should include the query params from props
      const calls = fetchSpy.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      const url = calls[0][0] as string;
      expect(url).toContain("/season");
      expect(url).toContain("year=2025");
      expect(url).toContain("season=FALL");
    });

    fetchSpy.mockRestore();
  });

  it("shows data grid after successful fetch", async () => {
    const mockData = {
      meta: {
        country: "MX",
        season: "SUMMER",
        year: 2026,
        total: 2,
        source: "test",
      },
      data: [
        {
          id: { anilist: 1, tmdb: null },
          title: "Test Anime 1",
          providers: [],
          images: { poster: null },
          meta: { genres: ["Action"], rating: 8.0, popularity: 80 },
        },
        {
          id: { anilist: 2, tmdb: null },
          title: "Test Anime 2",
          providers: [],
          images: { poster: null },
          meta: { genres: ["Comedy"], rating: 7.0, popularity: 70 },
        },
      ],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<SeasonPage />);

    await waitFor(() => {
      expect(screen.getAllByText("Test Anime 1").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Test Anime 2").length).toBeGreaterThan(0);
    });
  });

  it("shows empty filter state with reset button", async () => {
    const mockData = {
      meta: {
        country: "MX",
        season: "SUMMER",
        year: 2026,
        total: 2,
        source: "test",
      },
      data: [
        {
          id: { anilist: 1, tmdb: null },
          title: "Test Anime 1",
          providers: [],
          images: { poster: null },
          meta: { genres: ["Action"], rating: 8.0, popularity: 80 },
        },
      ],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    render(<SeasonPage />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getAllByText("Test Anime 1").length).toBeGreaterThan(0);
    });

    // Type a search that matches nothing
    const input = screen.getByPlaceholderText("Filtrar por título…");
    await userEvent.type(input, "nonexistent");

    await waitFor(() => {
      expect(screen.getByText("No anime match your filters")).toBeTruthy();
    });

    // Reset button should be visible
    const resetBtn = screen.getByText("Reset filters");
    expect(resetBtn).toBeTruthy();
  });
});
