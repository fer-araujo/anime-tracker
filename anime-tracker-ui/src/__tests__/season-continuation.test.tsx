import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Anime, RelatedMediaRef } from "@/types/anime";
import { AnimeCard } from "@/components/AnimeCard";
import { SeasonListRow } from "@/components/season/SeasonListRow";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn(), replace: vi.fn() }),
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <div data-testid="poster" aria-label={alt} />,
}));

const SYNOPSIS =
  "Rudeus continúa su viaje por el continente Begaritt en busca de su padre.";

function makeAnime(continuationOf: RelatedMediaRef | null): Anime {
  return {
    id: { anilist: 1, tmdb: null },
    title: "Mushoku Tensei Season 3",
    providers: ["Crunchyroll"],
    images: { poster: "https://example.com/p.jpg" },
    meta: {
      genres: ["Adventure", "Drama"],
      rating: 8.1,
      studio: "Studio Bind",
      type: "TV",
      episodes: 12,
      synopsis: SYNOPSIS,
      synopsisShort: SYNOPSIS,
      status: "RELEASING",
      continuationOf,
    },
  };
}

const PREQUEL: RelatedMediaRef = { id: 9, title: "Mushoku Tensei Season 2" };

/** The synopsis element carries the clamp; find it by its text. */
function synopsisClamp(container: HTMLElement): string {
  const node = [...container.querySelectorAll("button")].find((b) =>
    b.textContent?.includes("Rudeus"),
  );
  return node?.className ?? "";
}

describe("AnimeCard — continuation line", () => {
  it("names what the entry continues", () => {
    render(<AnimeCard anime={makeAnime(PREQUEL)} />);
    expect(screen.getByText("Mushoku Tensei Season 2")).toBeInTheDocument();
  });

  it("renders nothing when the entry starts a story", () => {
    render(<AnimeCard anime={makeAnime(null)} />);
    expect(screen.queryByText(/Mushoku Tensei Season 2/)).not.toBeInTheDocument();
  });

  it("shows no category label, only the name", () => {
    // The title already says "Season 3". A badge reading "Secuela" on top of
    // that repeats rather than informs, and at the rate sequels appear in a
    // season it would stop being read within seconds.
    render(<AnimeCard anime={makeAnime(PREQUEL)} />);
    expect(screen.queryByText(/^Secuela$/i)).not.toBeInTheDocument();
  });

  it("pays for the line out of the synopsis, not the card's height", () => {
    // Providers run to two rows on titles carried by five services; if the
    // line pushed the block down, the overlay would reflow only on sequels.
    const withPrequel = render(<AnimeCard anime={makeAnime(PREQUEL)} />);
    expect(synopsisClamp(withPrequel.container)).toContain("[-webkit-line-clamp:2]");

    const without = render(<AnimeCard anime={makeAnime(null)} />);
    expect(synopsisClamp(without.container)).toContain("[-webkit-line-clamp:3]");
  });
});

describe("SeasonListRow", () => {
  it("shows studio, episodes and providers without needing a hover", () => {
    // The whole reason the row exists: AnimeCard hides all of this behind
    // `md:group-hover`, which a touch screen never triggers.
    render(<SeasonListRow anime={makeAnime(null)} />);

    expect(screen.getByText(/Studio Bind/)).toBeInTheDocument();
    expect(screen.getByText(/12 eps/)).toBeInTheDocument();
    expect(screen.getByText("Crunchyroll")).toBeInTheDocument();
  });

  it("describes a continuation the same way the grid card does", () => {
    render(<SeasonListRow anime={makeAnime(PREQUEL)} />);
    expect(screen.getByText("Mushoku Tensei Season 2")).toBeInTheDocument();
  });

  it("falls back to Pirata when nothing legal resolved", () => {
    const anime = { ...makeAnime(null), providers: [] };
    render(<SeasonListRow anime={anime} />);
    expect(screen.getByText("Pirata")).toBeInTheDocument();
  });

  it("opens the anime when activated", async () => {
    const onOpen = vi.fn();
    const anime = makeAnime(null);
    render(<SeasonListRow anime={anime} onOpen={onOpen} />);

    screen.getByRole("button", { name: /Ver detalles de/ }).click();
    expect(onOpen).toHaveBeenCalledWith(anime);
  });
});
