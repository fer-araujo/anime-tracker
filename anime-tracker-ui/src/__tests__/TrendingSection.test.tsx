import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MinimalShelf } from "@/components/Shelf";
import type { Anime } from "@/types/anime";

const mockAnime = (overrides?: Partial<Anime>): Anime => ({
  id: { anilist: 1, tmdb: null },
  title: "Trending Anime",
  providers: ["Crunchyroll"],
  images: { poster: "https://example.com/poster.jpg", backdrop: null },
  ...overrides,
});

describe("MinimalShelf (used by TrendingSection)", () => {
  it("renders the section title", () => {
    render(
      <MinimalShelf title="Trending esta temporada" items={[mockAnime()]} />,
    );
    expect(screen.getByText("Trending esta temporada")).toBeDefined();
  });

  it("renders anime cards from items", () => {
    const items = [
      mockAnime({ id: { anilist: 1, tmdb: null }, title: "Anime A" }),
      mockAnime({ id: { anilist: 2, tmdb: null }, title: "Anime B" }),
    ];
    render(<MinimalShelf title="Trending" items={items} />);
    expect(screen.getByText("Anime A")).toBeDefined();
    expect(screen.getByText("Anime B")).toBeDefined();
  });

  it("renders nothing harmful on empty items", () => {
    render(<MinimalShelf title="Empty" items={[]} />);
    expect(screen.getByText("Empty")).toBeDefined();
  });
});
