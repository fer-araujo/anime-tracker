import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroCarouselCinematic } from "@/components/Spotlight";
import type { Anime } from "@/types/anime";

const mockAnime = (overrides?: Partial<Anime>): Anime => ({
  id: { anilist: 1, tmdb: null },
  title: "Test Anime",
  providers: [],
  images: {
    backdrop: "https://example.com/backdrop.jpg",
    banner: null,
    logo: null,
    poster: null,
  },
  meta: {
    synopsis: "A test anime synopsis",
    synopsisShort: "A test anime...",
    year: 2024,
    rating: 8.0,
    genres: ["Action"],
    status: "RELEASING",
    episodes: 12,
    type: "TV",
  },
  ...overrides,
});

describe("HeroCarouselCinematic", () => {
  it("renders with single item", () => {
    render(<HeroCarouselCinematic items={[mockAnime()]} />);
    expect(screen.getByText("Test Anime")).toBeDefined();
  });

  it("renders the synopsis (short version first)", () => {
    render(<HeroCarouselCinematic items={[mockAnime()]} />);
    expect(screen.getByText("A test anime...")).toBeDefined();
  });

  it("renders multiple items with navigation dots", () => {
    const items = [
      mockAnime({ id: { anilist: 1, tmdb: null }, title: "Anime 1" }),
      mockAnime({ id: { anilist: 2, tmdb: null }, title: "Anime 2" }),
    ];
    render(<HeroCarouselCinematic items={items} />);
    expect(screen.getByLabelText("Ir al anime 1")).toBeDefined();
    expect(screen.getByLabelText("Ir al anime 2")).toBeDefined();
  });

  it("shows rating when available", () => {
    render(<HeroCarouselCinematic items={[mockAnime()]} />);
    expect(screen.getByText("8.0")).toBeDefined();
  });

  it("shows status badge for RELEASING anime", () => {
    render(<HeroCarouselCinematic items={[mockAnime()]} />);
    expect(screen.getByText("En Emisión")).toBeDefined();
  });

  it("returns null when no items (no crash)", () => {
    const { container } = render(<HeroCarouselCinematic items={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("uses banner as fallback when backdrop is null", () => {
    const anime = mockAnime({
      images: {
        backdrop: null,
        banner: "https://example.com/banner.jpg",
        logo: null,
        poster: null,
      },
    });
    // Should not crash — banner is used as fallback via ??
    expect(() =>
      render(<HeroCarouselCinematic items={[anime]} />),
    ).not.toThrow();
  });
});
