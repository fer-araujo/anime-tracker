import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MinimalShelf } from "@/components/Shelf";
import type { Anime } from "@/types/anime";

const mockAnime = (overrides?: Partial<Anime>): Anime => ({
  id: { anilist: 1, tmdb: null },
  title: "Popular Anime",
  providers: ["Netflix"],
  images: { poster: "https://example.com/poster.jpg", backdrop: null },
  ...overrides,
});

describe("MinimalShelf — Popular Section", () => {
  it("renders the popular section title", () => {
    render(<MinimalShelf title="Animes populares" items={[mockAnime()]} />);
    expect(screen.getByText("Animes populares")).toBeDefined();
  });

  it("renders multiple items", () => {
    const items = [
      mockAnime({ id: { anilist: 1, tmdb: null }, title: "Anime X" }),
      mockAnime({ id: { anilist: 2, tmdb: null }, title: "Anime Y" }),
      mockAnime({ id: { anilist: 3, tmdb: null }, title: "Anime Z" }),
    ];
    render(<MinimalShelf title="Populares" items={items} />);
    expect(screen.getByText("Anime X")).toBeDefined();
    expect(screen.getByText("Anime Y")).toBeDefined();
    expect(screen.getByText("Anime Z")).toBeDefined();
  });
});
